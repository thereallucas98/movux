import { prisma } from '~/lib/db'
import { isWithinDecisionWindow } from '~/server/lib/decision-window'
import { notifyTransferRequested } from '~/server/notifications/transfer-events'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  TransferRequestRepository,
  TransferRequestRow,
} from '~/server/repositories/transfer-request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface RequestTransferInput {
  assignmentId: string
  targetUserId: string
  reason: string
}

export type RequestTransferResult =
  | { success: true; data: TransferRequestRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'DECISION_WINDOW_EXPIRED'
        | 'USER_NOT_WORKSPACE_MEMBER'
        | 'SHIFT_OVERLAP_CONFLICT'
        | 'VALIDATION_ERROR'
    }

export async function requestTransfer(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  transferRequestRepo: TransferRequestRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: RequestTransferInput,
): Promise<RequestTransferResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  if (input.targetUserId === principal.userId) {
    return { success: false, code: 'VALIDATION_ERROR' }
  }

  const row = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.assignmentId,
  )
  if (!row) return { success: false, code: 'NOT_FOUND' }

  if (row.userId !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }

  if (row.status !== 'PENDING_ACCEPT' && row.status !== 'ACCEPTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  // Window check applies to PENDING_ACCEPT only
  if (row.status === 'PENDING_ACCEPT') {
    if (!isWithinDecisionWindow(row.decisionDeadline)) {
      return { success: false, code: 'DECISION_WINDOW_EXPIRED' }
    }
  }

  // Target must be active workspace member
  const targetMembership = await workspaceMembershipRepo.findActive({
    workspaceId: row.shift.schedule.workspaceId,
    userId: input.targetUserId,
  })
  if (!targetMembership || !targetMembership.isActive) {
    return { success: false, code: 'USER_NOT_WORKSPACE_MEMBER' }
  }

  // Target must not have overlapping active assignment
  const overlaps = await assignmentRepo.findOverlappingForUser({
    userId: input.targetUserId,
    startAt: row.shift.startAt,
    endAt: row.shift.endAt,
    excludeShiftId: row.shiftId,
  })
  if (overlaps.length > 0) {
    return { success: false, code: 'SHIFT_OVERLAP_CONFLICT' }
  }

  const tr = await prisma.$transaction(async (tx) => {
    const created = await transferRequestRepo.create(
      {
        originalAssignmentId: row.id,
        targetUserId: input.targetUserId,
        requestedByUserId: principal.userId,
        reason: input.reason,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'TRANSFER_REQUESTED',
        entityType: 'TRANSFER_REQUEST',
        entityId: created.id,
        metadata: {
          shiftId: row.shiftId,
          originalAssignmentId: row.id,
          targetUserId: input.targetUserId,
          reason: input.reason,
        },
      },
      tx,
    )
    return created
  })

  const coords = await workspaceMembershipRepo.listActiveByRole(
    row.shift.schedule.workspaceId,
    ['ADMIN', 'COORDENADOR'],
  )
  const recipients = Array.from(
    new Set([input.targetUserId, ...coords.map((c) => c.userId)]),
  )
  await notifyTransferRequested({
    transferRequestId: tr.id,
    originalAssignmentId: row.id,
    shiftId: row.shiftId,
    shiftStartAt: row.shift.startAt,
    shiftEndAt: row.shift.endAt,
    workspaceId: row.shift.schedule.workspaceId,
    targetUserId: input.targetUserId,
    requestedByUserId: principal.userId,
    recipientUserIds: recipients,
  })

  return { success: true, data: tr }
}
