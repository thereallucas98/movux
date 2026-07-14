import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SoftDeleteWorkspaceCategoryInput {
  workspaceId: string
  categoryId: string
}

export type SoftDeleteWorkspaceCategoryResult =
  | { success: true }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'CANNOT_DELETE_GERAL'
    }

export async function softDeleteWorkspaceCategory(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  categoryRepo: CategoryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SoftDeleteWorkspaceCategoryInput,
): Promise<SoftDeleteWorkspaceCategoryResult> {
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

    if (existing.slug === 'general') {
      return { success: false, code: 'CANNOT_DELETE_GERAL' as const }
    }

    await categoryRepo.softDelete(input.categoryId, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_CATEGORY_DELETED',
        entityType: 'WORKSPACE_CATEGORY',
        entityId: input.categoryId,
        metadata: {
          workspaceId: input.workspaceId,
          slug: existing.slug,
        },
      },
      tx,
    )
    return { success: true as const }
  })
}
