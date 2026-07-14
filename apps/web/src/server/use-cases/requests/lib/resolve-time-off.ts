import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export const TIME_OFF_CASCADE_CAP = 50

export interface ResolveTimeOffDeps {
  requestRepo: RequestRepository
  shiftRepo: ShiftRepository
  assignmentRepo: AssignmentRepository
  auditRepo: AuditLogRepository
}

export type ResolveTimeOffResult =
  | { success: true; data: RequestRow }
  | {
      success: false
      code: 'INVALID_STATE_TRANSITION' | 'TIME_OFF_TOO_LARGE'
    }

export async function resolveTimeOff(
  deps: ResolveTimeOffDeps,
  request: RequestRow,
  resolverUserId: string,
  resolutionReason: string | null,
  tx: DbClient,
): Promise<ResolveTimeOffResult> {
  if (!request.timeOffStart || !request.timeOffEnd) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const affected = await deps.assignmentRepo.findForUserInRange(
    {
      userId: request.requestedById,
      workspaceId: request.workspaceId,
      startAt: request.timeOffStart,
      endAt: request.timeOffEnd,
      statuses: ['PENDING_ACCEPT', 'ACCEPTED'],
    },
    tx,
  )

  if (affected.length > TIME_OFF_CASCADE_CAP) {
    return { success: false, code: 'TIME_OFF_TOO_LARGE' }
  }

  const now = new Date()
  for (const a of affected) {
    await deps.assignmentRepo.update(
      a.id,
      {
        status: 'CANCELLED',
        decidedAt: now,
        rejectionReason: `TIME_OFF approved (request ${request.id})`,
      },
      tx,
    )
    await deps.shiftRepo.update(
      a.shiftId,
      { assignmentMode: 'OPEN_FOR_APPLY' },
      tx,
    )
    await deps.auditRepo.log(
      {
        actorUserId: resolverUserId,
        action: 'ASSIGNMENT_CANCELLED_BY_TIME_OFF',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: a.id,
        metadata: {
          workspaceId: request.workspaceId,
          requestId: request.id,
          shiftId: a.shiftId,
        },
      },
      tx,
    )
  }

  const updated = await deps.requestRepo.update(
    request.id,
    {
      status: 'APPROVED',
      resolvedAt: now,
      resolvedById: resolverUserId,
      resolutionReason,
    },
    tx,
  )

  await deps.auditRepo.log(
    {
      actorUserId: resolverUserId,
      action: 'REQUEST_TIME_OFF_APPROVED',
      entityType: 'REQUEST',
      entityId: updated.id,
      metadata: {
        workspaceId: updated.workspaceId,
        cascadeCount: affected.length,
      },
    },
    tx,
  )

  return { success: true, data: updated }
}
