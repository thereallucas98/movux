import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'

import { listCategoriesForWorkspace } from '../categories/list-categories-for-workspace.use-case'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetCategoryBreakdownInput {
  workspaceId: string
  fromAt: Date
  toAt: Date
  limit?: number
}

export interface CategoryBreakdownRow {
  categoryId: string
  categoryName: string
  shiftCount: number
  filled: number
  total: number
}

export type GetCategoryBreakdownResult =
  | { success: true; data: CategoryBreakdownRow[] }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function getCategoryBreakdown(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  categoryRepo: CategoryRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  principal: Principal | null,
  input: GetCategoryBreakdownInput,
): Promise<GetCategoryBreakdownResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const categoriesResult = await listCategoriesForWorkspace(
    workspaceRepo,
    workspaceMembershipRepo,
    categoryRepo,
    principal,
    { workspaceId: input.workspaceId },
  )
  if (!categoriesResult.success) {
    return { success: false, code: categoriesResult.code }
  }

  const [shiftCounts, shifts] = await Promise.all([
    shiftRepo.countByCategoryForWeek(input.workspaceId, {
      fromAt: input.fromAt,
      toAt: input.toAt,
    }),
    shiftRepo.listUpcomingForWorkspace(input.workspaceId, {
      fromAt: input.fromAt,
      toAt: input.toAt,
      limit: 10_000,
    }),
  ])

  // Per-category filled count: group shifts by category, then count active
  // assignments per category by combining the assignment count map with the
  // shift→category mapping.
  const filledByShift = await assignmentRepo.countActiveByShiftIds(
    shifts.map((s) => s.id),
  )
  const filledByCategory = new Map<string, number>()
  for (const shift of shifts) {
    const filled = filledByShift.get(shift.id) ?? 0
    filledByCategory.set(
      shift.categoryId,
      (filledByCategory.get(shift.categoryId) ?? 0) + filled,
    )
  }

  const countsByCategory = new Map(shiftCounts.map((c) => [c.categoryId, c]))

  const rows: CategoryBreakdownRow[] = categoriesResult.data.map((cat) => {
    const counts = countsByCategory.get(cat.id)
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      shiftCount: counts?.count ?? 0,
      filled: filledByCategory.get(cat.id) ?? 0,
      total: counts?.totalHeadcount ?? 0,
    }
  })

  rows.sort((a, b) => b.shiftCount - a.shiftCount)

  return {
    success: true,
    data: rows.slice(0, input.limit ?? 5),
  }
}
