import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { computeTransferDeadline } from '~/server/lib/decision-window'
import { notifyTransferDecided } from '~/server/notifications/transfer-events'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type {
  TransferRequestRepository,
  TransferRequestRow,
} from '~/server/repositories/transfer-request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export type TransferDecision = 'APPROVE' | 'REJECT'

export interface DecideTransferRequestInput {
  transferRequestId: string
  decision: TransferDecision
  reason?: string
}

export type DecideTransferRequestResult =
  | { success: true; data: TransferRequestRow; shiftUnfilled: boolean }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'SHIFT_OVERLAP_CONFLICT'
        | 'USER_NOT_WORKSPACE_MEMBER'
    }

export async function decideTransferRequest(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  transferRequestRepo: TransferRequestRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: DecideTransferRequestInput,
): Promise<DecideTransferRequestResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const tr = await transferRequestRepo.findByIdWithJoins(
    input.transferRequestId,
  )
  if (!tr) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    tr.originalAssignment.shift.schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (tr.status !== 'PENDING') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const now = new Date()

  if (input.decision === 'REJECT') {
    const updated = await prisma.$transaction(async (tx) => {
      const u = await transferRequestRepo.update(
        tr.id,
        {
          status: 'REJECTED',
          decidedByUserId: principal.userId,
          decidedAt: now,
          decisionReason: input.reason ?? null,
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'TRANSFER_REJECTED',
          entityType: 'TRANSFER_REQUEST',
          entityId: tr.id,
          metadata: {
            shiftId: tr.originalAssignment.shiftId,
            originalAssignmentId: tr.originalAssignmentId,
            decisionReason: input.reason ?? null,
          },
        },
        tx,
      )
      return u
    })
    await notifyTransferDecided({
      transferRequestId: tr.id,
      originalAssignmentId: tr.originalAssignmentId,
      workspaceId: tr.originalAssignment.shift.schedule.workspaceId,
      decision: 'REJECT',
      decidedByUserId: principal.userId,
      recipientUserIds: [tr.requestedByUserId],
    })
    return { success: true, data: updated, shiftUnfilled: false }
  }

  // APPROVE: re-check target overlap + member status, then atomic 4-step
  const targetMembership = await workspaceMembershipRepo.findActive({
    workspaceId: tr.originalAssignment.shift.schedule.workspaceId,
    userId: tr.targetUserId,
  })
  if (!targetMembership || !targetMembership.isActive) {
    return { success: false, code: 'USER_NOT_WORKSPACE_MEMBER' }
  }
  const overlaps = await assignmentRepo.findOverlappingForUser({
    userId: tr.targetUserId,
    startAt: tr.originalAssignment.shift.startAt,
    endAt: tr.originalAssignment.shift.endAt,
    excludeShiftId: tr.originalAssignment.shiftId,
  })
  if (overlaps.length > 0) {
    return { success: false, code: 'SHIFT_OVERLAP_CONFLICT' }
  }

  const wasFilled = tr.originalAssignment.shift.status === 'FILLED'
  const wasAccepted = tr.originalAssignment.status === 'ACCEPTED'

  const newDeadline = computeTransferDeadline({
    now,
    shiftStartAt: tr.originalAssignment.shift.startAt,
    decisionWindowHours: tr.originalAssignment.shift.decisionWindowHours,
  })

  const result = await prisma.$transaction(async (tx) => {
    // 1. Original assignment → TRANSFERRED
    await assignmentRepo.update(
      tr.originalAssignmentId,
      { status: 'TRANSFERRED', decidedAt: now },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_TRANSFERRED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: tr.originalAssignmentId,
        metadata: {
          transferRequestId: tr.id,
          targetUserId: tr.targetUserId,
          previousStatus: tr.originalAssignment.status,
        },
      },
      tx,
    )

    // 2. Create new assignment for target
    const newAssignment = await assignmentRepo.create(
      {
        shiftId: tr.originalAssignment.shiftId,
        userId: tr.targetUserId,
        assignedByUserId: principal.userId,
        status: 'PENDING_ACCEPT',
        decisionDeadline: newDeadline,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_CREATED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: newAssignment.id,
        metadata: {
          viaTransferRequestId: tr.id,
          originalAssignmentId: tr.originalAssignmentId,
          decisionDeadline: newDeadline,
        },
      },
      tx,
    )

    // 3. Update TransferRequest → APPROVED
    const updatedTr = await transferRequestRepo.update(
      tr.id,
      {
        status: 'APPROVED',
        decidedByUserId: principal.userId,
        decidedAt: now,
        decisionReason: input.reason ?? null,
        newAssignmentId: newAssignment.id,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'TRANSFER_APPROVED',
        entityType: 'TRANSFER_REQUEST',
        entityId: tr.id,
        metadata: {
          shiftId: tr.originalAssignment.shiftId,
          originalAssignmentId: tr.originalAssignmentId,
          newAssignmentId: newAssignment.id,
          decisionReason: input.reason ?? null,
        },
      },
      tx,
    )

    // 4. Unfill shift if was FILLED + original was ACCEPTED
    let shiftUnfilled = false
    if (wasFilled && wasAccepted) {
      await shiftRepo.setStatus(tr.originalAssignment.shiftId, 'OPEN', {}, tx)
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'SHIFT_UNFILLED',
          entityType: 'SHIFT',
          entityId: tr.originalAssignment.shiftId,
          metadata: {
            reason: 'TRANSFER_APPROVED',
            transferRequestId: tr.id,
          },
        },
        tx,
      )
      shiftUnfilled = true
    }

    return { updatedTr, shiftUnfilled }
  })

  await notifyTransferDecided({
    transferRequestId: tr.id,
    originalAssignmentId: tr.originalAssignmentId,
    workspaceId: tr.originalAssignment.shift.schedule.workspaceId,
    decision: 'APPROVE',
    decidedByUserId: principal.userId,
    recipientUserIds: [tr.requestedByUserId, tr.targetUserId],
  })

  return {
    success: true,
    data: result.updatedTr,
    shiftUnfilled: result.shiftUnfilled,
  }
}
