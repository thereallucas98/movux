import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  MembershipRow,
  WorkspaceMembershipRepository,
} from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'
import type { WorkspaceRole } from './add-workspace-member.use-case'

export interface ChangeWorkspaceMemberRoleInput {
  workspaceId: string
  memberId: string
  role: WorkspaceRole
}

export type ChangeWorkspaceMemberRoleResult =
  | { success: true; data: MembershipRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'LAST_ADMIN'
        | 'CANNOT_DEMOTE_SELF'
    }

export async function changeWorkspaceMemberRole(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ChangeWorkspaceMemberRoleInput,
): Promise<ChangeWorkspaceMemberRoleResult> {
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

    if (membership.role === 'ADMIN' && input.role !== 'ADMIN') {
      const activeAdmins = await workspaceMembershipRepo.countActiveAdmins(
        input.workspaceId,
        tx,
      )
      if (activeAdmins <= 1) {
        return { success: false, code: 'LAST_ADMIN' as const }
      }
    }

    if (
      membership.userId === principal!.userId &&
      input.role !== membership.role
    ) {
      return { success: false, code: 'CANNOT_DEMOTE_SELF' as const }
    }

    const fromRole = membership.role
    const updated = await workspaceMembershipRepo.updateRole(
      input.memberId,
      input.role,
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_MEMBER_ROLE_CHANGED',
        entityType: 'WORKSPACE_MEMBERSHIP',
        entityId: input.memberId,
        metadata: {
          workspaceId: input.workspaceId,
          userId: membership.userId,
          fromRole,
          toRole: input.role,
        },
      },
      tx,
    )
    return { success: true as const, data: updated }
  })
}
