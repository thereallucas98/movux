import { prisma } from '~/lib/db'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { TransferRequestRepository } from '~/server/repositories/transfer-request.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CancelTransferRequestInput {
  transferRequestId: string
}

export type CancelTransferRequestResult =
  | { success: true }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function cancelTransferRequest(
  transferRequestRepo: TransferRequestRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CancelTransferRequestInput,
): Promise<CancelTransferRequestResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const tr = await transferRequestRepo.findByIdWithJoins(
    input.transferRequestId,
  )
  if (!tr) return { success: false, code: 'NOT_FOUND' }

  if (tr.requestedByUserId !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }
  if (tr.status !== 'PENDING') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await prisma.$transaction(async (tx) => {
    await transferRequestRepo.update(
      tr.id,
      { status: 'CANCELLED', decidedAt: new Date() },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'TRANSFER_CANCELLED',
        entityType: 'TRANSFER_REQUEST',
        entityId: tr.id,
        metadata: {
          shiftId: tr.originalAssignment.shiftId,
          originalAssignmentId: tr.originalAssignmentId,
        },
      },
      tx,
    )
  })

  return { success: true }
}
