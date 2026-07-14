import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface RemoveWorkspaceMemberInput {
  workspaceId: string
  memberId: string
}

export type RemoveWorkspaceMemberResult =
  | { success: true }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'LAST_ADMIN'
    }

export async function removeWorkspaceMember(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: RemoveWorkspaceMemberInput,
): Promise<RemoveWorkspaceMemberResult> {
  const auth = await assertAdminOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  return prisma.$transaction(async (tx) => {
    const membership = await workspaceMembershipRepo.findById(
      input.memberId,
      tx,
    )
    if (
      !membership ||
      membership.workspaceId !== input.workspaceId ||
      !membership.isActive
    ) {
      return { success: false, code: 'NOT_FOUND' as const }
    }

    if (membership.role === 'ADMIN') {
      const activeAdmins = await workspaceMembershipRepo.countActiveAdmins(
        input.workspaceId,
        tx,
      )
      if (activeAdmins <= 1) {
        return { success: false, code: 'LAST_ADMIN' as const }
      }
    }

    await workspaceMembershipRepo.softDelete(input.memberId, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_MEMBER_REMOVED',
        entityType: 'WORKSPACE_MEMBERSHIP',
        entityId: input.memberId,
        metadata: {
          workspaceId: input.workspaceId,
          userId: membership.userId,
          role: membership.role,
        },
      },
      tx,
    )
    return { success: true as const }
  })
}
