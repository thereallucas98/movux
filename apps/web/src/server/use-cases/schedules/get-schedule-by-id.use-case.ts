import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  ScheduleRepository,
  ScheduleRow,
} from '~/server/repositories/schedule.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetScheduleByIdInput {
  scheduleId: string
}

export type GetScheduleByIdResult =
  | { success: true; data: ScheduleRow }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function getScheduleById(
  scheduleRepo: ScheduleRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  principal: Principal | null,
  input: GetScheduleByIdInput,
): Promise<GetScheduleByIdResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }
  const schedule = await scheduleRepo.findById(input.scheduleId)
  if (!schedule) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  return { success: true, data: schedule }
}
