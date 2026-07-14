import { prisma } from '~/lib/db'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'
import type { Principal } from '../tenants/create-tenant.use-case'
import { canCancel } from './lib/transitions'

export interface CancelRequestInput {
  requestId: string
}

export type CancelRequestResult =
  | { success: true; data: RequestRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function cancelRequest(
  requestRepo: RequestRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CancelRequestInput,
): Promise<CancelRequestResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const existing = await requestRepo.findByIdWithRelations(input.requestId)
  if (!existing) return { success: false, code: 'NOT_FOUND' }
  if (existing.requestedById !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }
  if (!canCancel(existing.status)) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await requestRepo.update(
      input.requestId,
      { status: 'CANCELLED' },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'REQUEST_CANCELLED',
        entityType: 'REQUEST',
        entityId: updated.id,
        metadata: {
          workspaceId: updated.workspaceId,
          type: updated.type,
          previousStatus: existing.status,
          ...(existing.type === 'SWAP' && {
            sourceShiftId: existing.swapSourceAssignment?.shiftId ?? null,
            targetShiftId: existing.swapTargetAssignment?.shiftId ?? null,
          }),
          ...(existing.type === 'OFFER' && {
            shiftId: existing.offerSourceAssignment?.shiftId ?? null,
          }),
        },
      },
      tx,
    )
    return { success: true, data: updated } as CancelRequestResult
  })
}
