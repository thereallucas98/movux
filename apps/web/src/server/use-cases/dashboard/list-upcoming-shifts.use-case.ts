import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type {
  ShiftRepository,
  ShiftStatus,
} from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'

import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListUpcomingShiftsInput {
  workspaceId: string
  fromAt: Date
  toAt: Date
  limit: number
}

export interface UpcomingShift {
  id: string
  scheduleId: string
  categoryId: string
  categoryName: string
  startAt: Date
  endAt: Date
  headcount: number
  filled: number
  status: ShiftStatus
}

export type ListUpcomingShiftsResult =
  | { success: true; data: UpcomingShift[] }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function listUpcomingShifts(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  principal: Principal | null,
  input: ListUpcomingShiftsInput,
): Promise<ListUpcomingShiftsResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const shifts = await shiftRepo.listUpcomingForWorkspace(input.workspaceId, {
    fromAt: input.fromAt,
    toAt: input.toAt,
    limit: input.limit,
  })

  if (shifts.length === 0) {
    return { success: true, data: [] }
  }

  const counts = await assignmentRepo.countActiveByShiftIds(
    shifts.map((s) => s.id),
  )

  return {
    success: true,
    data: shifts.map((s) => ({
      id: s.id,
      scheduleId: s.scheduleId,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      startAt: s.startAt,
      endAt: s.endAt,
      headcount: s.headcount,
      filled: counts.get(s.id) ?? 0,
      status: s.status,
    })),
  }
}
