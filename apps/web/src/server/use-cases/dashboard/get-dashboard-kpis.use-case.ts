import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type {
  RequestRepository,
  RequestStatus,
} from '~/server/repositories/request.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'

import type { Principal } from '../tenants/create-tenant.use-case'

const COORD_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COORDENADOR'])
const PENDING_REQUEST_STATUSES: RequestStatus[] = ['PENDING', 'PENDING_PEER']

export interface GetDashboardKpisInput {
  workspaceId: string
  fromAt: Date
  toAt: Date
}

export interface DashboardKpis {
  shiftsThisWeek: number
  filledTotals: { filled: number; total: number }
  pendingRequests: number
}

export type GetDashboardKpisResult =
  | { success: true; data: DashboardKpis }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function getDashboardKpis(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  requestRepo: RequestRepository,
  principal: Principal | null,
  input: GetDashboardKpisInput,
): Promise<GetDashboardKpisResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const { userId, role } = principal as Principal

  // Run the shift aggregate, the per-shift filled count, and the pending
  // requests count in parallel — they are independent reads.
  const [aggregate, pendingRequests] = await Promise.all([
    aggregateFilled(shiftRepo, assignmentRepo, input),
    countPendingByRole(requestRepo, input.workspaceId, userId, role),
  ])

  return {
    success: true,
    data: {
      shiftsThisWeek: aggregate.count,
      filledTotals: { filled: aggregate.filled, total: aggregate.total },
      pendingRequests,
    },
  }
}

async function aggregateFilled(
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  input: GetDashboardKpisInput,
): Promise<{ count: number; total: number; filled: number }> {
  const agg = await shiftRepo.aggregateForWeek(input.workspaceId, {
    fromAt: input.fromAt,
    toAt: input.toAt,
  })
  if (agg.count === 0) {
    return { count: 0, total: 0, filled: 0 }
  }
  // Fetch shift ids in the same window to compute filled count via groupBy.
  const shifts = await shiftRepo.listUpcomingForWorkspace(input.workspaceId, {
    fromAt: input.fromAt,
    toAt: input.toAt,
    limit: 10_000,
  })
  const filled = await assignmentRepo.countActiveTotalForShiftIds(
    shifts.map((s) => s.id),
  )
  return { count: agg.count, total: agg.totalHeadcount, filled }
}

async function countPendingByRole(
  requestRepo: RequestRepository,
  workspaceId: string,
  userId: string,
  role: string,
): Promise<number> {
  if (COORD_ROLES.has(role)) {
    return requestRepo.countByWorkspaceAndStatus(
      workspaceId,
      PENDING_REQUEST_STATUSES,
    )
  }
  return requestRepo.countForUserAndStatus(
    workspaceId,
    userId,
    PENDING_REQUEST_STATUSES,
  )
}
