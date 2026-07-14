import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { ListPage } from '~/server/repositories/tenant.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ListShiftsFilter,
  ShiftRepository,
  ShiftRow,
} from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListShiftsInput {
  scheduleId: string
  filter: ListShiftsFilter
  cursor?: string
  limit: number
}

export type ListShiftsResult =
  | { success: true; data: ListPage<ShiftRow> }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listShiftsForSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  principal: Principal | null,
  input: ListShiftsInput,
): Promise<ListShiftsResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const schedule = await scheduleRepo.findById(input.scheduleId)
  if (!schedule) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const page = await shiftRepo.listForSchedule(
    input.scheduleId,
    input.filter,
    input.cursor,
    input.limit,
  )
  return { success: true, data: page }
}
