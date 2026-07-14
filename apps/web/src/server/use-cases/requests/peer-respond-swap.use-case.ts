import { prisma } from '~/lib/db'
import { notifyRequestPeerDecision } from '~/server/notifications/request-events'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'
import type { Principal } from '../tenants/create-tenant.use-case'
import { canPeerRespond } from './lib/transitions'

export interface PeerRespondSwapInput {
  requestId: string
  decision: 'ACCEPT' | 'REJECT'
}

export type PeerRespondSwapResult =
  | { success: true; data: RequestRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function peerRespondSwap(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  requestRepo: RequestRepository,
  assignmentRepo: AssignmentRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: PeerRespondSwapInput,
): Promise<PeerRespondSwapResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const existing = await requestRepo.findById(input.requestId)
  if (!existing) return { success: false, code: 'NOT_FOUND' }
  if (existing.swapTargetUserId !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }
  if (!canPeerRespond(existing.type, existing.status)) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  // Lookup both assignments up-front so the audit metadata can carry
  // sourceShiftId + targetShiftId for the timeline (Task 14 §1.2). On ACCEPT
  // we additionally validate status + future-shift; REJECT skips that.
  if (!existing.swapSourceAssignmentId || !existing.swapTargetAssignmentId) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  const source = await assignmentRepo.findByIdWithShiftAndSchedule(
    existing.swapSourceAssignmentId,
  )
  const target = await assignmentRepo.findByIdWithShiftAndSchedule(
    existing.swapTargetAssignmentId,
  )
  if (input.decision === 'ACCEPT') {
    if (!source || !target) {
      return { success: false, code: 'INVALID_STATE_TRANSITION' }
    }
    if (source.status !== 'ACCEPTED' || target.status !== 'ACCEPTED') {
      return { success: false, code: 'INVALID_STATE_TRANSITION' }
    }
    if (
      source.shift.startAt.getTime() <= Date.now() ||
      target.shift.startAt.getTime() <= Date.now()
    ) {
      return { success: false, code: 'INVALID_STATE_TRANSITION' }
    }
  }

  const now = new Date()

  const updated = await prisma.$transaction(async (tx) => {
    const u = await requestRepo.update(
      input.requestId,
      input.decision === 'ACCEPT'
        ? { status: 'PENDING', peerAcceptedAt: now }
        : { status: 'REJECTED', peerRejectedAt: now },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action:
          input.decision === 'ACCEPT'
            ? 'REQUEST_SWAP_PEER_ACCEPTED'
            : 'REQUEST_SWAP_PEER_REJECTED',
        entityType: 'REQUEST',
        entityId: u.id,
        metadata: {
          workspaceId: u.workspaceId,
          type: 'SWAP',
          ...(source && { sourceShiftId: source.shift.id }),
          ...(target && { targetShiftId: target.shift.id }),
          previousStatus: existing.status,
        },
      },
      tx,
    )
    return u
  })

  const coords = await workspaceMembershipRepo.listActiveByRole(
    updated.workspaceId,
    ['ADMIN', 'COORDENADOR'],
  )
  await notifyRequestPeerDecision({
    requestId: updated.id,
    workspaceId: updated.workspaceId,
    peerUserId: principal.userId,
    decision: input.decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
    recipientUserIds: Array.from(
      new Set([existing.requestedById, ...coords.map((c) => c.userId)]),
    ),
  })

  return { success: true, data: updated }
}
