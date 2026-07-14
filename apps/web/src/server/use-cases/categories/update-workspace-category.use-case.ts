import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  CategoryRepository,
  CategoryRow,
} from '~/server/repositories/category.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface UpdateWorkspaceCategoryInput {
  workspaceId: string
  categoryId: string
  data: {
    name?: string
    description?: string | null
  }
}

export type UpdateWorkspaceCategoryResult =
  | { success: true; data: CategoryRow }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function updateWorkspaceCategory(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  categoryRepo: CategoryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UpdateWorkspaceCategoryInput,
): Promise<UpdateWorkspaceCategoryResult> {
  const auth = await assertAdminOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  return prisma.$transaction(async (tx) => {
    const existing = await categoryRepo.findById(input.categoryId, tx)
    if (
      !existing ||
      existing.scope !== 'WORKSPACE' ||
      existing.workspaceId !== input.workspaceId
    ) {
      return { success: false, code: 'NOT_FOUND' as const }
    }

    const updated = await categoryRepo.update(input.categoryId, input.data, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_CATEGORY_UPDATED',
        entityType: 'WORKSPACE_CATEGORY',
        entityId: input.categoryId,
        metadata: {
          workspaceId: input.workspaceId,
          changes: input.data,
        },
      },
      tx,
    )
    return { success: true as const, data: updated }
  })
}
