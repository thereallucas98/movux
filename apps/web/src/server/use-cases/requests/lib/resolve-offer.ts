import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ResolveOfferDeps {
  requestRepo: RequestRepository
  shiftRepo: ShiftRepository
  assignmentRepo: AssignmentRepository
  auditRepo: AuditLogRepository
}

export type ResolveOfferResult =
  | { success: true; data: RequestRow }
  | { success: false; code: 'INVALID_STATE_TRANSITION' }

/**
 * Approving an OFFER flips the source shift to OPEN_FOR_APPLY but keeps the
 * requester's assignment as ACCEPTED. The replacement comes from the apply
 * queue (Task 11). When that replacement is accepted (Task 10 + Task 12 §10
 * patch in accept-assignment), the incumbent gets cancelled at that moment.
 */
export async function resolveOffer(
  deps: ResolveOfferDeps,
  request: RequestRow,
  resolverUserId: string,
  resolutionReason: string | null,
  tx: DbClient,
): Promise<ResolveOfferResult> {
  if (!request.offerSourceAssignmentId) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  const source = await deps.assignmentRepo.findByIdWithShiftAndSchedule(
    request.offerSourceAssignmentId,
    tx,
  )
  if (!source) return { success: false, code: 'INVALID_STATE_TRANSITION' }
  if (source.status !== 'ACCEPTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (source.shift.startAt.getTime() <= Date.now()) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (source.shift.assignmentMode !== 'DIRECT_ASSIGN') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await deps.shiftRepo.update(
    source.shift.id,
    { assignmentMode: 'OPEN_FOR_APPLY' },
    tx,
  )

  const updated = await deps.requestRepo.update(
    request.id,
    {
      status: 'APPROVED',
      resolvedAt: new Date(),
      resolvedById: resolverUserId,
      resolutionReason,
    },
    tx,
  )

  await deps.auditRepo.log(
    {
      actorUserId: resolverUserId,
      action: 'REQUEST_OFFER_APPROVED',
      entityType: 'REQUEST',
      entityId: updated.id,
      metadata: {
        workspaceId: updated.workspaceId,
        type: 'OFFER',
        shiftId: source.shift.id,
        offerSourceAssignmentId: request.offerSourceAssignmentId,
      },
    },
    tx,
  )

  return { success: true, data: updated }
}
