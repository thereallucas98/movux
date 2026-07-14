import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ShiftExpectedCompositionRepository,
  ShiftExpectedCompositionRow,
} from '~/server/repositories/shift-expected-composition.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetShiftExpectedCompositionInput {
  shiftId: string
}

export type GetShiftExpectedCompositionResult =
  | { success: true; data: ShiftExpectedCompositionRow[] }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function getShiftExpectedComposition(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  principal: Principal | null,
  input: GetShiftExpectedCompositionInput,
): Promise<GetShiftExpectedCompositionResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const shift = await shiftRepo.findById(input.shiftId)
  if (!shift) return { success: false, code: 'NOT_FOUND' }

  const schedule = await scheduleRepo.findById(shift.scheduleId)
  if (!schedule) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const items = await compositionRepo.findByShift(input.shiftId)
  return { success: true, data: items }
}
