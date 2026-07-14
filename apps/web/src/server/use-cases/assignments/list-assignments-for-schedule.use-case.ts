import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  AssignmentRepository,
  AssignmentStatus,
} from '~/server/repositories/assignment.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListAssignmentsForScheduleInput {
  scheduleId: string
}

export interface ScheduleAssignmentSummary {
  shiftId: string
  userId: string
  status: AssignmentStatus
  decisionDeadline: Date
}

export type ListAssignmentsForScheduleResult =
  | { success: true; data: ScheduleAssignmentSummary[] }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listAssignmentsForSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  assignmentRepo: AssignmentRepository,
  principal: Principal | null,
  input: ListAssignmentsForScheduleInput,
): Promise<ListAssignmentsForScheduleResult> {
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

  const data = await assignmentRepo.listForSchedule(input.scheduleId)
  return { success: true, data }
}
