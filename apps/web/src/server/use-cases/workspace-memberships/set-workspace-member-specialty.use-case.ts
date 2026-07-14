import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { SpecialtyRepository } from '~/server/repositories/specialty.repository'
import type {
  UserSpecialtyRepository,
  UserSpecialtyRow,
} from '~/server/repositories/user-specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SetWorkspaceMemberSpecialtyInput {
  workspaceId: string
  memberId: string
  specialtyId: string
}

export type SetWorkspaceMemberSpecialtyResult =
  | { success: true; data: UserSpecialtyRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'TARGET_MEMBER_NOT_FOUND'
        | 'SPECIALTY_NOT_IN_WORKSPACE'
    }

export async function setWorkspaceMemberSpecialty(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  specialtyRepo: SpecialtyRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SetWorkspaceMemberSpecialtyInput,
): Promise<SetWorkspaceMemberSpecialtyResult> {
  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const membership = await workspaceMembershipRepo.findById(input.memberId)
  if (
    !membership ||
    membership.workspaceId !== input.workspaceId ||
    !membership.isActive
  ) {
    return { success: false, code: 'TARGET_MEMBER_NOT_FOUND' }
  }

  const available = await specialtyRepo.findAvailableForWorkspace(
    input.workspaceId,
    input.specialtyId,
  )
  if (!available) {
    return { success: false, code: 'SPECIALTY_NOT_IN_WORKSPACE' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await userSpecialtyRepo.findActiveByMember(
      { userId: membership.userId, workspaceId: input.workspaceId },
      tx,
    )

    if (current && current.specialtyId === input.specialtyId) {
      return current
    }

    if (current) {
      await userSpecialtyRepo.softDelete(current.id, tx)
    }

    const created = await userSpecialtyRepo.create(
      {
        userId: membership.userId,
        workspaceId: input.workspaceId,
        specialtyId: input.specialtyId,
      },
      tx,
    )

    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_MEMBER_SPECIALTY_SET',
        entityType: 'USER_SPECIALTY',
        entityId: created.id,
        metadata: {
          workspaceId: input.workspaceId,
          userId: membership.userId,
          specialtyId: input.specialtyId,
          reassignedFromId: current?.id ?? null,
        },
      },
      tx,
    )
    return created
  })

  return { success: true, data: result }
}
