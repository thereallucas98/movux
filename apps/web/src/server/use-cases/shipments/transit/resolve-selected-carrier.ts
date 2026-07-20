import type { ShipmentStatus } from '~/generated/prisma/client'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'

interface ResolveSelectedCarrierRepos {
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
}

export async function resolveSelectedCarrier(
  repos: ResolveSelectedCarrierRepos,
  userId: string,
  shipmentId: string,
): Promise<{ status: ShipmentStatus } | null> {
  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (!shipment) return null

  const accepted = await repos.proposalRepo.findAcceptedByShipment(shipmentId)
  if (!accepted || accepted.carrierId !== userId) return null

  return { status: shipment.status }
}
