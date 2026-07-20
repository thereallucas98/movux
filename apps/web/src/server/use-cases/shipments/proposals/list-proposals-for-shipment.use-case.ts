import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type {
  ProposalRepository,
  ProposalWithAttempts,
} from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { sweepExpiredProposals } from './sweep-expired-proposals'

export type ListProposalsForShipmentResult =
  | { success: true; data: ProposalWithAttempts[] }
  | { success: false; code: 'NOT_FOUND' }

interface ListProposalsForShipmentRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  queueRepo: ProposalQueueRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function listProposalsForShipment(
  repos: ListProposalsForShipmentRepos,
  userId: string,
  shipmentId: string,
): Promise<ListProposalsForShipmentResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const shipment = await repos.shipmentRepo.findStatusForOwner(shipmentId, customerProfile.id)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }

  await sweepExpiredProposals(
    repos.proposalRepo,
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  const data = await repos.proposalRepo.listByShipment(shipmentId)
  return { success: true, data }
}
