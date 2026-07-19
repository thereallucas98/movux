import type { ProposalQueueRepository, QueueEntry } from '../../../repositories/proposal-queue.repository'

export type GetMyQueueEntryResult =
  | { success: true; entry: QueueEntry }
  | { success: false; code: 'NOT_FOUND' }

export async function getMyQueueEntry(
  queueRepo: ProposalQueueRepository,
  carrierId: string,
  shipmentId: string,
): Promise<GetMyQueueEntryResult> {
  const entry = await queueRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!entry) {
    return { success: false, code: 'NOT_FOUND' }
  }
  return { success: true, entry }
}
