import type { ProposalQueueRepository, QueueEntry } from '../../../repositories/proposal-queue.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { refillCalledGroup } from './refill-called-group'

export type JoinProposalQueueResult =
  | { success: true; entry: QueueEntry }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'ALREADY_IN_QUEUE' }

interface JoinProposalQueueRepos {
  shipmentRepo: ShipmentRepository
  queueRepo: ProposalQueueRepository
}

export async function joinProposalQueue(
  repos: JoinProposalQueueRepos,
  carrierId: string,
  shipmentId: string,
): Promise<JoinProposalQueueResult> {
  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (shipment.status !== 'OPEN') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const existing = await repos.queueRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (existing) {
    return { success: false, code: 'ALREADY_IN_QUEUE' }
  }

  const position = (await repos.queueRepo.countByShipment(shipmentId)) + 1
  await repos.queueRepo.create(shipmentId, carrierId, position)

  await refillCalledGroup(repos.queueRepo, shipmentId)

  const entry = await repos.queueRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  return { success: true, entry: entry as QueueEntry }
}
