import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { ShiftCandidateRepository } from '~/server/repositories/candidate.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListCandidatesSummaryInput {
  scheduleId: string
}

export type ListCandidatesSummaryResult =
  | {
      success: true
      data: Array<{ shiftId: string; queuedCount: number }>
    }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listCandidatesSummaryForSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  candidateRepo: ShiftCandidateRepository,
  principal: Principal | null,
  input: ListCandidatesSummaryInput,
): Promise<ListCandidatesSummaryResult> {
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

  const shifts = await shiftRepo.listForSchedule(
    input.scheduleId,
    {},
    null,
    1000,
  )
  const shiftIds = shifts.data.map((s) => s.id)
  const counts = await candidateRepo.countQueuedByShiftIds(shiftIds)
  const data = shiftIds.map((shiftId) => ({
    shiftId,
    queuedCount: counts.get(shiftId) ?? 0,
  }))
  return { success: true, data }
}
