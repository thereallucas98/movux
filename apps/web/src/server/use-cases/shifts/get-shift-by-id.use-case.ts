import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ShiftExpectedCompositionRepository,
  ShiftExpectedCompositionRow,
} from '~/server/repositories/shift-expected-composition.repository'
import type {
  ShiftRepository,
  ShiftRow,
} from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetShiftInput {
  shiftId: string
}

export interface ShiftDetail extends ShiftRow {
  expectedComposition: ShiftExpectedCompositionRow[]
}

export type GetShiftResult =
  | { success: true; data: ShiftDetail }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function getShiftById(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  principal: Principal | null,
  input: GetShiftInput,
): Promise<GetShiftResult> {
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

  const composition = await compositionRepo.findByShift(shift.id)
  return {
    success: true,
    data: { ...shift, expectedComposition: composition },
  }
}
