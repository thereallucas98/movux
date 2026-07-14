import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import {
  computeCompositionStatus,
  type CompositionStatus,
} from '~/server/lib/composition-match'
import type {
  AssignmentRepository,
  AssignmentRow,
} from '~/server/repositories/assignment.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftExpectedCompositionRepository } from '~/server/repositories/shift-expected-composition.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListAssignmentsInput {
  shiftId: string
}

export interface AssignmentWithMatch extends AssignmentRow {
  compositionStatus: CompositionStatus
}

export type ListAssignmentsResult =
  | { success: true; data: AssignmentWithMatch[] }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listAssignmentsForShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  principal: Principal | null,
  input: ListAssignmentsInput,
): Promise<ListAssignmentsResult> {
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

  const [rows, composition] = await Promise.all([
    assignmentRepo.listForShift(input.shiftId),
    compositionRepo.findByShift(input.shiftId),
  ])

  const enriched: AssignmentWithMatch[] = []
  for (const row of rows) {
    const us = await userSpecialtyRepo.findActiveByMember({
      userId: row.userId,
      workspaceId: schedule.workspaceId,
    })
    enriched.push({
      ...row,
      compositionStatus: computeCompositionStatus(
        us ? { specialtyId: us.specialtyId } : null,
        composition,
      ),
    })
  }

  return { success: true, data: enriched }
}
