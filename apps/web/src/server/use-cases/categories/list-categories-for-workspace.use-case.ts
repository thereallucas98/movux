import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  CategoryRepository,
  CategoryRow,
  CategoryScope,
  CategoryVertical,
} from '~/server/repositories/category.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListCategoriesForWorkspaceInput {
  workspaceId: string
}

export type MergedCategory = CategoryRow & { source: CategoryScope }

export type ListCategoriesForWorkspaceResult =
  | { success: true; data: MergedCategory[] }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function listCategoriesForWorkspace(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  categoryRepo: CategoryRepository,
  principal: Principal | null,
  input: ListCategoriesForWorkspaceInput,
): Promise<ListCategoriesForWorkspaceResult> {
  const auth = await assertActiveMemberOfWorkspace(
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

  const [globals, tenantCats, workspaceCats] = await Promise.all([
    categoryRepo.listGlobal(workspace.vertical as CategoryVertical),
    categoryRepo.listTenant(workspace.tenantId),
    categoryRepo.listWorkspace(workspace.id),
  ])

  const merged = new Map<string, MergedCategory>()
  for (const g of globals) merged.set(g.slug, { ...g, source: 'GLOBAL' })
  for (const t of tenantCats) merged.set(t.slug, { ...t, source: 'TENANT' })
  for (const w of workspaceCats)
    merged.set(w.slug, { ...w, source: 'WORKSPACE' })

  const sorted = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  )

  return { success: true, data: sorted }
}
