import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import {
  loadTenantContext,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  SpecialtyRepository,
  SpecialtyRow,
} from '~/server/repositories/specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CreateWorkspaceSpecialtyInput {
  workspaceId: string
  slug: string
  name: string
  description?: string | null
}

export type CreateWorkspaceSpecialtyResult =
  | { success: true; data: SpecialtyRow }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'ALREADY_EXISTS'
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

export async function createWorkspaceSpecialty(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  specialtyRepo: SpecialtyRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreateWorkspaceSpecialtyInput,
): Promise<CreateWorkspaceSpecialtyResult> {
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
    resource: 'specialtiesPerWorkspace',
    workspaceId: input.workspaceId,
  })
  if (planLimit) return planLimit

  try {
    const specialty = await prisma.$transaction(async (tx) => {
      const created = await specialtyRepo.create(
        {
          scope: 'WORKSPACE',
          tenantId: workspace.tenantId,
          workspaceId: workspace.id,
          slug: input.slug,
          name: input.name,
          description: input.description ?? null,
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal!.userId,
          action: 'WORKSPACE_SPECIALTY_CREATED',
          entityType: 'WORKSPACE_SPECIALTY',
          entityId: created.id,
          metadata: {
            workspaceId: workspace.id,
            slug: input.slug,
            name: input.name,
          },
        },
        tx,
      )
      return created
    })
    return { success: true, data: specialty }
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return { success: false, code: 'ALREADY_EXISTS' }
    }
    throw error
  }
}
