import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import {
  computeCompositionStatus,
  type CompositionStatus,
} from '~/server/lib/composition-match'
import { notifyAssignmentCreated } from '~/server/notifications/assignment-events'
import type {
  AlternativeShiftRow,
  AssignmentRepository,
  AssignmentRow,
  OverlappingAssignmentRow,
} from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftExpectedCompositionRepository } from '~/server/repositories/shift-expected-composition.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface AssignUsersToShiftInput {
  workspaceId: string
  shiftId: string
  userIds: string[]
}

export interface AssignmentWithMatch extends AssignmentRow {
  compositionStatus: CompositionStatus
}

export interface AssignmentConflict {
  userId: string
  conflictingShiftId: string
  conflictingStartAt: Date
  conflictingEndAt: Date
}

export type AssignUsersToShiftResult =
  | { success: true; data: AssignmentWithMatch[] }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'SHIFT_HEADCOUNT_FULL'
        | 'USER_NOT_WORKSPACE_MEMBER'
        | 'VALIDATION_ERROR'
    }
  | {
      success: false
      code: 'SHIFT_OVERLAP_CONFLICT'
      conflicts: AssignmentConflict[]
      alternatives: AlternativeShiftRow[]
    }

export async function assignUsersToShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: AssignUsersToShiftInput,
): Promise<AssignUsersToShiftResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  // Deduplicate userIds (Set check)
  const seen = new Set<string>()
  for (const id of input.userIds) {
    if (seen.has(id)) {
      return { success: false, code: 'VALIDATION_ERROR' }
    }
    seen.add(id)
  }

  const shift = await shiftRepo.findById(input.shiftId)
  if (!shift) return { success: false, code: 'NOT_FOUND' }

  const schedule = await scheduleRepo.findById(shift.scheduleId)
  if (!schedule || schedule.workspaceId !== input.workspaceId) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (schedule.status !== 'PUBLISHED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  // Task 11: Block direct assignment when shift is OPEN_FOR_APPLY (mutual exclusion)
  if (shift.assignmentMode === 'OPEN_FOR_APPLY') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  // Headcount enforcement
  const filled = await assignmentRepo.countByShiftAndStatus(input.shiftId, [
    'PENDING_ACCEPT',
    'ACCEPTED',
  ])
  if (filled + input.userIds.length > shift.headcount) {
    return { success: false, code: 'SHIFT_HEADCOUNT_FULL' }
  }

  // Per-user pre-checks: workspace membership + cross-workspace overlap
  for (const userId of input.userIds) {
    const member = await workspaceMembershipRepo.findActive({
      workspaceId: input.workspaceId,
      userId,
    })
    if (!member || !member.isActive) {
      return { success: false, code: 'USER_NOT_WORKSPACE_MEMBER' }
    }

    const overlaps: OverlappingAssignmentRow[] =
      await assignmentRepo.findOverlappingForUser({
        userId,
        startAt: shift.startAt,
        endAt: shift.endAt,
        excludeShiftId: input.shiftId,
      })
    if (overlaps.length > 0) {
      const alternatives = await assignmentRepo.findAlternativeShifts({
        workspaceId: input.workspaceId,
        categoryId: shift.categoryId,
        targetShiftId: input.shiftId,
        userId,
        limit: 5,
      })
      return {
        success: false,
        code: 'SHIFT_OVERLAP_CONFLICT',
        conflicts: overlaps.map((o) => ({
          userId,
          conflictingShiftId: o.shiftId,
          conflictingStartAt: o.startAt,
          conflictingEndAt: o.endAt,
        })),
        alternatives,
      }
    }
  }

  const composition = await compositionRepo.findByShift(input.shiftId)
  const decisionDeadline = new Date(
    Date.now() + shift.decisionWindowHours * 60 * 60 * 1000,
  )

  const now = new Date()
  const created = await prisma.$transaction(async (tx) => {
    const out: AssignmentWithMatch[] = []
    for (const userId of input.userIds) {
      const isSelfAssign = userId === principal.userId
      const status = isSelfAssign ? 'ACCEPTED' : 'PENDING_ACCEPT'
      const decidedAt = isSelfAssign ? now : null

      const assignment = await assignmentRepo.create(
        {
          shiftId: input.shiftId,
          userId,
          assignedByUserId: principal.userId,
          status,
          decisionDeadline,
          decidedAt,
        },
        tx,
      )

      const userSpecialty = await userSpecialtyRepo.findActiveByMember(
        { userId, workspaceId: input.workspaceId },
        tx,
      )
      const compositionStatus = computeCompositionStatus(
        userSpecialty ? { specialtyId: userSpecialty.specialtyId } : null,
        composition,
      )

      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'ASSIGNMENT_CREATED',
          entityType: 'SHIFT_ASSIGNMENT',
          entityId: assignment.id,
          metadata: {
            shiftId: input.shiftId,
            assigneeUserId: userId,
            decisionDeadline,
            compositionStatus,
            autoAccepted: isSelfAssign,
          },
        },
        tx,
      )

      out.push({ ...assignment, compositionStatus })
    }
    return out
  })

  // Fire-and-forget notification, after tx commit. One per assignee.
  for (const assignment of created) {
    if (assignment.status === 'PENDING_ACCEPT') {
      await notifyAssignmentCreated({
        assignment: {
          id: assignment.id,
          shiftId: shift.id,
          scheduleId: shift.scheduleId,
          categoryId: shift.categoryId,
          workspaceId: input.workspaceId,
          userId: assignment.userId,
          decisionDeadline,
          autoAccepted: false,
          shiftStartAt: shift.startAt,
          shiftEndAt: shift.endAt,
        },
        actorUserId: principal.userId,
        recipientUserIds: [assignment.userId],
      })
    }
  }

  return { success: true, data: created }
}
