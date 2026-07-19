import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import { refillCalledGroup } from './refill-called-group'

export type WithdrawProposalQueueResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

export async function withdrawProposalQueue(
  queueRepo: ProposalQueueRepository,
  carrierId: string,
  shipmentId: string,
): Promise<WithdrawProposalQueueResult> {
  const entry = await queueRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!entry) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (entry.status !== 'WAITING' && entry.status !== 'CALLED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await queueRepo.updateStatus(entry.id, 'WITHDRAWN')
  await refillCalledGroup(queueRepo, shipmentId)

  return { success: true }
}
