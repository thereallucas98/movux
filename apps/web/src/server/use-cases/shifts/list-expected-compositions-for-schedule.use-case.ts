import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftExpectedCompositionRepository } from '~/server/repositories/shift-expected-composition.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListExpectedCompositionsInput {
  scheduleId: string
}

export type ListExpectedCompositionsResult =
  | {
      success: true
      data: { shiftId: string; specialtyId: string; count: number }[]
    }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listExpectedCompositionsForSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  principal: Principal | null,
  input: ListExpectedCompositionsInput,
): Promise<ListExpectedCompositionsResult> {
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

  const rows = await compositionRepo.listForSchedule(input.scheduleId)
  return { success: true, data: rows }
}
