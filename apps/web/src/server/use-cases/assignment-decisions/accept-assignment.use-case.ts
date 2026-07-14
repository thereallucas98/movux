import { prisma } from '~/lib/db'
import { isWithinDecisionWindow } from '~/server/lib/decision-window'
import { notifyAssignmentAccepted } from '~/server/notifications/assignment-events'
import type {
  AssignmentRepository,
  AssignmentRow,
} from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface AcceptAssignmentInput {
  assignmentId: string
}

export type AcceptAssignmentResult =
  | { success: true; data: AssignmentRow; shiftFilled: boolean }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'DECISION_WINDOW_EXPIRED'
    }

export async function acceptAssignment(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: AcceptAssignmentInput,
): Promise<AcceptAssignmentResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const row = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.assignmentId,
  )
  if (!row) return { success: false, code: 'NOT_FOUND' }

  if (row.userId !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }
  if (row.status !== 'PENDING_ACCEPT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (!isWithinDecisionWindow(row.decisionDeadline)) {
    return { success: false, code: 'DECISION_WINDOW_EXPIRED' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await assignmentRepo.update(
      row.id,
      { status: 'ACCEPTED', decidedAt: new Date() },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_ACCEPTED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: row.id,
        metadata: { shiftId: row.shiftId },
      },
      tx,
    )

    // Task 12 §10 — OFFER closure:
    // When a candidate accepts on a shift in OPEN_FOR_APPLY mode, cancel any
    // other ACCEPTED assignment on the same shift. This is how an approved
    // OFFER eventually releases the original requester (BF §9.5).
    if (row.shift.assignmentMode === 'OPEN_FOR_APPLY') {
      const others = await assignmentRepo.listForShift(row.shiftId, tx)
      for (const other of others) {
        if (other.id === row.id) continue
        if (other.status !== 'ACCEPTED') continue
        await assignmentRepo.update(
          other.id,
          {
            status: 'CANCELLED',
            decidedAt: new Date(),
            rejectionReason: `Replaced by OFFER acceptance (assignment ${row.id})`,
          },
          tx,
        )
        await auditRepo.log(
          {
            actorUserId: principal.userId,
            action: 'ASSIGNMENT_CANCELLED_BY_OFFER',
            entityType: 'SHIFT_ASSIGNMENT',
            entityId: other.id,
            metadata: { shiftId: row.shiftId, replacedBy: row.id },
          },
          tx,
        )
      }
    }

    // Auto-FILL shift if last slot
    let shiftFilled = false
    const acceptedCount = await assignmentRepo.countByShiftAndStatus(
      row.shiftId,
      ['ACCEPTED'],
      tx,
    )
    if (
      acceptedCount === row.shift.headcount &&
      row.shift.schedule.status === 'PUBLISHED'
    ) {
      // Re-read shift status from row.shift if available; OPEN -> FILLED
      // (we trust the snapshot since this tx serializes)
      await shiftRepo.setStatus(row.shiftId, 'FILLED', {}, tx)
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'SHIFT_FILLED',
          entityType: 'SHIFT',
          entityId: row.shiftId,
          metadata: {
            triggeredByAssignmentId: row.id,
            triggeredByUserId: principal.userId,
          },
        },
        tx,
      )
      shiftFilled = true
    }

    return { updated, shiftFilled }
  })

  // Fire-and-forget notification, post-tx.
  const recipients = await workspaceMembershipRepo.listActiveByRole(
    row.shift.schedule.workspaceId,
    ['ADMIN', 'COORDENADOR'],
  )
  await notifyAssignmentAccepted({
    assignment: {
      id: row.id,
      shiftId: row.shiftId,
      scheduleId: row.shift.scheduleId,
      workspaceId: row.shift.schedule.workspaceId,
      shiftStartAt: row.shift.startAt,
      shiftEndAt: row.shift.endAt,
    },
    reason: null,
    actorUserId: principal.userId,
    recipientUserIds: recipients.map((r) => r.userId),
  })

  return {
    success: true,
    data: result.updated,
    shiftFilled: result.shiftFilled,
  }
}
