import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { isWithinDecisionWindow } from '~/server/lib/decision-window'
import { notifyAssignmentRejected } from '~/server/notifications/assignment-events'
import type {
  AssignmentRepository,
  AssignmentRow,
} from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface RejectAssignmentInput {
  assignmentId: string
  reason: string
}

export type RejectAssignmentResult =
  | { success: true; data: AssignmentRow; shiftUnfilled: boolean }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'DECISION_WINDOW_EXPIRED'
    }

export async function rejectAssignment(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: RejectAssignmentInput,
): Promise<RejectAssignmentResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const row = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.assignmentId,
  )
  if (!row) return { success: false, code: 'NOT_FOUND' }

  // Determine actor: assignee path vs admin override
  const isAssignee = row.userId === principal.userId
  let isAdminOverride = false
  if (!isAssignee) {
    const auth = await assertAdminOrCoordenadorOfWorkspace(
      workspaceMembershipRepo,
      principal,
      row.shift.schedule.workspaceId,
    )
    if (!auth.authorized) {
      return { success: false, code: 'FORBIDDEN' }
    }
    isAdminOverride = true
  }

  // State guard: assignee can only reject PENDING_ACCEPT (Q7 Ideal — self-ACCEPTED can't be rejected by assignee)
  // Admin override can reject PENDING_ACCEPT or ACCEPTED or EXPIRED (clear-state semantics)
  if (isAdminOverride) {
    if (
      row.status !== 'PENDING_ACCEPT' &&
      row.status !== 'ACCEPTED' &&
      row.status !== 'EXPIRED'
    ) {
      return { success: false, code: 'INVALID_STATE_TRANSITION' }
    }
  } else {
    if (row.status !== 'PENDING_ACCEPT') {
      return { success: false, code: 'INVALID_STATE_TRANSITION' }
    }
    if (!isWithinDecisionWindow(row.decisionDeadline)) {
      return { success: false, code: 'DECISION_WINDOW_EXPIRED' }
    }
  }

  const wasAccepted = row.status === 'ACCEPTED'

  const result = await prisma.$transaction(async (tx) => {
    const updated = await assignmentRepo.update(
      row.id,
      {
        status: 'REJECTED',
        decidedAt: new Date(),
        rejectionReason: input.reason,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_REJECTED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: row.id,
        metadata: {
          shiftId: row.shiftId,
          reason: input.reason,
          actorOnBehalf: isAdminOverride,
          bypassedDeadline:
            isAdminOverride && Date.now() > row.decisionDeadline.getTime(),
        },
      },
      tx,
    )

    // If rejecting an ACCEPTED that was filling a FILLED shift, unfill
    let shiftUnfilled = false
    if (wasAccepted && row.shift.status === 'FILLED') {
      await shiftRepo.setStatus(row.shiftId, 'OPEN', {}, tx)
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'SHIFT_UNFILLED',
          entityType: 'SHIFT',
          entityId: row.shiftId,
          metadata: { reason: 'ASSIGNMENT_REJECTED_BY_ADMIN' },
        },
        tx,
      )
      shiftUnfilled = true
    }

    return { updated, shiftUnfilled }
  })

  const recipients = await workspaceMembershipRepo.listActiveByRole(
    row.shift.schedule.workspaceId,
    ['ADMIN', 'COORDENADOR'],
  )
  await notifyAssignmentRejected({
    assignment: {
      id: row.id,
      shiftId: row.shiftId,
      scheduleId: row.shift.scheduleId,
      workspaceId: row.shift.schedule.workspaceId,
      shiftStartAt: row.shift.startAt,
      shiftEndAt: row.shift.endAt,
    },
    reason: input.reason,
    actorUserId: principal.userId,
    recipientUserIds: recipients.map((r) => r.userId),
  })

  return {
    success: true,
    data: result.updated,
    shiftUnfilled: result.shiftUnfilled,
  }
}
