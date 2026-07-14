import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SoftDeleteWorkspaceInput {
  workspaceId: string
}

export type SoftDeleteWorkspaceResult =
  | { success: true }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function softDeleteWorkspace(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SoftDeleteWorkspaceInput,
): Promise<SoftDeleteWorkspaceResult> {
  const auth = await assertAdminOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  await prisma.$transaction(async (tx) => {
    await workspaceRepo.softDelete(input.workspaceId, tx)
    await workspaceMembershipRepo.softDeleteAllByWorkspace(
      input.workspaceId,
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_DELETED',
        entityType: 'WORKSPACE',
        entityId: input.workspaceId,
      },
      tx,
    )
  })

  return { success: true }
}
