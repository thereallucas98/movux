import type { ShipmentEvent } from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../repositories/customer-profile.repository'
import type { ProposalRepository } from '../../repositories/proposal.repository'
import type { ShipmentEventRepository } from '../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'
import { resolveSafetyParticipant } from './safety/resolve-safety-participant'

export type GetShipmentEventsResult =
  | { success: true; events: ShipmentEvent[] }
  | { success: false; code: 'NOT_FOUND' }

interface GetShipmentEventsRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  shipmentEventRepo: ShipmentEventRepository
}

export async function getShipmentEvents(
  repos: GetShipmentEventsRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
): Promise<GetShipmentEventsResult> {
  const participant = await resolveSafetyParticipant(
    repos,
    userId,
    principalRole,
    shipmentId,
  )
  if (!participant) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const events = await repos.shipmentEventRepo.listByShipment(shipmentId)

  return { success: true, events }
}
