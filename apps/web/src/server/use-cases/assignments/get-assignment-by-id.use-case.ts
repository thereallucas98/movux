import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import {
  computeCompositionStatus,
  type CompositionStatus,
} from '~/server/lib/composition-match'
import type {
  AssignmentRepository,
  AssignmentRow,
} from '~/server/repositories/assignment.repository'
import type { ShiftExpectedCompositionRepository } from '~/server/repositories/shift-expected-composition.repository'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetAssignmentInput {
  assignmentId: string
}

export interface AssignmentDetail extends AssignmentRow {
  compositionStatus: CompositionStatus
}

export type GetAssignmentResult =
  | { success: true; data: AssignmentDetail }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function getAssignmentById(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  principal: Principal | null,
  input: GetAssignmentInput,
): Promise<GetAssignmentResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const row = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.assignmentId,
  )
  if (!row) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    row.shift.schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const [us, composition] = await Promise.all([
    userSpecialtyRepo.findActiveByMember({
      userId: row.userId,
      workspaceId: row.shift.schedule.workspaceId,
    }),
    compositionRepo.findByShift(row.shiftId),
  ])

  const compositionStatus = computeCompositionStatus(
    us ? { specialtyId: us.specialtyId } : null,
    composition,
  )

  return {
    success: true,
    data: {
      id: row.id,
      shiftId: row.shiftId,
      userId: row.userId,
      assignedByUserId: row.assignedByUserId,
      status: row.status,
      decisionDeadline: row.decisionDeadline,
      decidedAt: row.decidedAt,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      compositionStatus,
    },
  }
}
