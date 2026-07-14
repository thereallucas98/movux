import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import {
  loadTenantContext,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  CategoryRepository,
  CategoryRow,
} from '~/server/repositories/category.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CreateWorkspaceCategoryInput {
  workspaceId: string
  slug: string
  name: string
  description?: string | null
}

export type CreateWorkspaceCategoryResult =
  | { success: true; data: CategoryRow }
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

export async function createWorkspaceCategory(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  categoryRepo: CategoryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreateWorkspaceCategoryInput,
): Promise<CreateWorkspaceCategoryResult> {
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
    resource: 'categoriesPerWorkspace',
    workspaceId: input.workspaceId,
  })
  if (planLimit) return planLimit

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await categoryRepo.create(
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
          action: 'WORKSPACE_CATEGORY_CREATED',
          entityType: 'WORKSPACE_CATEGORY',
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
    return { success: true, data: category }
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return { success: false, code: 'ALREADY_EXISTS' }
    }
    throw error
  }
}
