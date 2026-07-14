import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface UnsetWorkspaceMemberSpecialtyInput {
  workspaceId: string
  memberId: string
}

export type UnsetWorkspaceMemberSpecialtyResult =
  | { success: true }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'TARGET_MEMBER_NOT_FOUND'
        | 'NOT_FOUND'
    }

export async function unsetWorkspaceMemberSpecialty(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UnsetWorkspaceMemberSpecialtyInput,
): Promise<UnsetWorkspaceMemberSpecialtyResult> {
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

  return prisma.$transaction(async (tx) => {
    const current = await userSpecialtyRepo.findActiveByMember(
      { userId: membership.userId, workspaceId: input.workspaceId },
      tx,
    )
    if (!current) {
      return { success: false, code: 'NOT_FOUND' as const }
    }

    await userSpecialtyRepo.softDelete(current.id, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_MEMBER_SPECIALTY_UNSET',
        entityType: 'USER_SPECIALTY',
        entityId: current.id,
        metadata: {
          workspaceId: input.workspaceId,
          userId: membership.userId,
          specialtyId: current.specialtyId,
        },
      },
      tx,
    )
    return { success: true as const }
  })
}
