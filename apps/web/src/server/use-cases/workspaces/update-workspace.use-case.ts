import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type {
  WorkspaceRepository,
  WorkspaceRow,
} from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'
import type { WorkspaceVertical } from './create-workspace.use-case'

export interface UpdateWorkspaceInput {
  workspaceId: string
  data: {
    name?: string
    timezone?: string
    vertical?: WorkspaceVertical
  }
}

export type UpdateWorkspaceResult =
  | { success: true; data: WorkspaceRow }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function updateWorkspace(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UpdateWorkspaceInput,
): Promise<UpdateWorkspaceResult> {
  const auth = await assertAdminOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await workspaceRepo.update(
      input.workspaceId,
      input.data,
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_UPDATED',
        entityType: 'WORKSPACE',
        entityId: workspace.id,
        metadata: { changes: input.data },
      },
      tx,
    )
    return workspace
  })

  return { success: true, data: result }
}
