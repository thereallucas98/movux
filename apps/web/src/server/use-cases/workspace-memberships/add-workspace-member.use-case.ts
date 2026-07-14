import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import {
  loadTenantContext,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { SpecialtyRepository } from '~/server/repositories/specialty.repository'
import type { UserRepository } from '~/server/repositories/user.repository'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type {
  MembershipRow,
  WorkspaceMembershipRepository,
} from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export type WorkspaceRole = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'

export interface AddWorkspaceMemberInput {
  workspaceId: string
  email: string
  role: WorkspaceRole
  specialtyId: string
}

export type AddWorkspaceMemberResult =
  | { success: true; data: MembershipRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'TARGET_USER_NOT_FOUND'
        | 'ALREADY_MEMBER'
        | 'SPECIALTY_NOT_IN_WORKSPACE'
    }
  | PlanLimitFailure

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

export async function addWorkspaceMember(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  userRepo: UserRepository,
  auditRepo: AuditLogRepository,
  specialtyRepo: SpecialtyRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  principal: Principal | null,
  input: AddWorkspaceMemberInput,
): Promise<AddWorkspaceMemberResult> {
  const auth = await assertAdminOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const workspace = await workspaceRepo.findById(input.workspaceId)
  if (!workspace) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const tenant = await loadTenantContext(workspace.tenantId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }
  const planLimit = await tryEnforce({
    tenant,
    resource: 'membersPerWorkspace',
    workspaceId: input.workspaceId,
  })
  if (planLimit) return planLimit

  const normalizedEmail = input.email.trim().toLowerCase()
  const targetUser = await userRepo.findActiveByEmail(normalizedEmail)
  if (!targetUser) {
    return { success: false, code: 'TARGET_USER_NOT_FOUND' }
  }

  // Specialty must be reachable from the workspace (GLOBAL ∪ TENANT ∪ WORKSPACE).
  const specialty = await specialtyRepo.findAvailableForWorkspace(
    input.workspaceId,
    input.specialtyId,
  )
  if (!specialty) {
    return { success: false, code: 'SPECIALTY_NOT_IN_WORKSPACE' }
  }

  try {
    const membership = await prisma.$transaction(async (tx) => {
      const existing = await workspaceMembershipRepo.findAny(
        { workspaceId: input.workspaceId, userId: targetUser.id },
        tx,
      )

      const row = existing
        ? existing.isActive
          ? null
          : await workspaceMembershipRepo.reactivate(
              existing.id,
              input.role,
              tx,
            )
        : await workspaceMembershipRepo.create(
            {
              workspaceId: input.workspaceId,
              userId: targetUser.id,
              role: input.role,
            },
            tx,
          )

      if (!row) {
        throw new PrismaUniqueError()
      }

      // Idempotent: only create UserSpecialty if the (userId, workspaceId)
      // pair doesn't already have one (e.g., reactivation case).
      const existingSpec = await userSpecialtyRepo.findActiveByMember(
        { userId: targetUser.id, workspaceId: input.workspaceId },
        tx,
      )
      if (!existingSpec) {
        await userSpecialtyRepo.create(
          {
            userId: targetUser.id,
            workspaceId: input.workspaceId,
            specialtyId: input.specialtyId,
          },
          tx,
        )
      }

      await auditRepo.log(
        {
          actorUserId: principal!.userId,
          action: 'WORKSPACE_MEMBER_ADDED',
          entityType: 'WORKSPACE_MEMBERSHIP',
          entityId: row.id,
          metadata: {
            workspaceId: input.workspaceId,
            userId: targetUser.id,
            role: input.role,
            specialtyId: input.specialtyId,
            reactivated: existing !== null && !existing.isActive,
          },
        },
        tx,
      )
      return row
    })
    return { success: true, data: membership }
  } catch (error) {
    if (error instanceof PrismaUniqueError || isPrismaUniqueViolation(error)) {
      return { success: false, code: 'ALREADY_MEMBER' }
    }
    throw error
  }
}

class PrismaUniqueError extends Error {
  constructor() {
    super('Already a member')
  }
}
