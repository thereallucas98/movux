import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ShiftPatternRepository,
  ShiftPatternRow,
} from '~/server/repositories/shift-pattern.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListPatternsInput {
  scheduleId: string
}

export type ListPatternsResult =
  | { success: true; data: ShiftPatternRow[] }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listPatternsForSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  patternRepo: ShiftPatternRepository,
  principal: Principal | null,
  input: ListPatternsInput,
): Promise<ListPatternsResult> {
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

  const patterns = await patternRepo.listForSchedule(input.scheduleId)
  return { success: true, data: patterns }
}
