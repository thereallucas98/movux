import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ResolveSwapDeps {
  requestRepo: RequestRepository
  assignmentRepo: AssignmentRepository
  auditRepo: AuditLogRepository
}

export type ResolveSwapResult =
  | { success: true; data: RequestRow }
  | { success: false; code: 'INVALID_STATE_TRANSITION' }

/**
 * Atomic SWAP using the 3-step nullable window:
 *   1. source.userId -> NULL (parks the slot)
 *   2. target.userId -> source.userId (target user takes source slot)
 *   3. (former) source -> target.userId (now holds target user; original
 *      requester takes the now-free target slot via target update sequence)
 *
 * Postgres's UNIQUE(shiftId, userId) treats NULLs as distinct, so the
 * intermediate state stays valid inside the transaction.
 */
export async function resolveSwap(
  deps: ResolveSwapDeps,
  request: RequestRow,
  resolverUserId: string,
  resolutionReason: string | null,
  tx: DbClient,
): Promise<ResolveSwapResult> {
  if (
    !request.swapSourceAssignmentId ||
    !request.swapTargetAssignmentId ||
    !request.swapTargetUserId
  ) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const source = await deps.assignmentRepo.findByIdWithShiftAndSchedule(
    request.swapSourceAssignmentId,
    tx,
  )
  const target = await deps.assignmentRepo.findByIdWithShiftAndSchedule(
    request.swapTargetAssignmentId,
    tx,
  )
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

  const requesterId = request.requestedById
  const targetUserId = request.swapTargetUserId

  // 3-step atomic swap
  await deps.assignmentRepo.update(
    request.swapSourceAssignmentId,
    { status: 'ACCEPTED' }, // dummy status update keeps row touched
    tx,
  )
  await deps.assignmentRepo.update(
    request.swapTargetAssignmentId,
    { status: 'ACCEPTED' },
    tx,
  )

  // Use raw SQL for the userId nulling to bypass any future Prisma type
  // gating on userId; the column is now nullable in the schema.
  const dbAny = tx as unknown as {
    shiftAssignment: {
      update: (args: {
        where: { id: string }
        data: { userId: string | null }
      }) => Promise<unknown>
    }
  }
  await dbAny.shiftAssignment.update({
    where: { id: request.swapSourceAssignmentId },
    data: { userId: null },
  })
  await dbAny.shiftAssignment.update({
    where: { id: request.swapTargetAssignmentId },
    data: { userId: requesterId },
  })
  await dbAny.shiftAssignment.update({
    where: { id: request.swapSourceAssignmentId },
    data: { userId: targetUserId },
  })

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
      action: 'REQUEST_SWAP_APPROVED',
      entityType: 'REQUEST',
      entityId: updated.id,
      metadata: {
        workspaceId: updated.workspaceId,
        type: 'SWAP',
        sourceShiftId: source.shift.id,
        targetShiftId: target.shift.id,
        sourceAssignmentId: request.swapSourceAssignmentId,
        targetAssignmentId: request.swapTargetAssignmentId,
        previousSourceUserId: requesterId,
        previousTargetUserId: targetUserId,
      },
    },
    tx,
  )

  return { success: true, data: updated }
}
