import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'

const CALL_GROUP_SIZE = 3

/**
 * Synchronous "hybrid" queue advance — no background job. Called from any
 * use-case that can free or fill a CALLED slot (join, withdraw, and later
 * S2-T2/S2-T3 when an entry becomes EXHAUSTED).
 */
export async function refillCalledGroup(
  queueRepo: ProposalQueueRepository,
  shipmentId: string,
): Promise<void> {
  const calledCount = await queueRepo.countCalledByShipment(shipmentId)
  const slots = CALL_GROUP_SIZE - calledCount
  if (slots <= 0) return

  const nextWaiting = await queueRepo.findNextWaiting(shipmentId, slots)
  if (nextWaiting.length > 0) {
    await queueRepo.markManyCalled(nextWaiting.map((entry) => entry.id))
  }
}
