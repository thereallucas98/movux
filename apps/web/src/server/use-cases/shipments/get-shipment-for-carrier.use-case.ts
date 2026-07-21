import type { ProposalQueueRepository } from '../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../repositories/proposal.repository'
import type {
  ShipmentRepository,
  ShipmentWithDetails,
} from '../../repositories/shipment.repository'

export type GetShipmentForCarrierResult =
  | { success: true; shipment: ShipmentWithDetails }
  | { success: false; code: 'NOT_FOUND' }

interface GetShipmentForCarrierRepos {
  shipmentRepo: ShipmentRepository
  queueRepo: ProposalQueueRepository
  proposalRepo: ProposalRepository
}

// Visibilidade: mesmo conjunto de status que listOpenForBrowse libera pra
// entrar na fila (OPEN e PROPOSALS_RECEIVED — fila ainda aceita entrada
// nos dois) OU o carrier logado já tem fila/proposta pro shipmentId (mesma
// checagem já usada por myQueueEntry/myProposal) — não diferencia "não
// existe" de "não é seu" (evita confirmar existência pra quem não tem acesso).
const BROWSABLE_STATUSES = ['OPEN', 'PROPOSALS_RECEIVED']

export async function getShipmentForCarrier(
  repos: GetShipmentForCarrierRepos,
  carrierId: string,
  shipmentId: string,
): Promise<GetShipmentForCarrierResult> {
  const shipment = await repos.shipmentRepo.findById(shipmentId)
  if (!shipment) return { success: false, code: 'NOT_FOUND' }

  if (BROWSABLE_STATUSES.includes(shipment.status)) {
    return { success: true, shipment }
  }

  const [queueEntry, proposal] = await Promise.all([
    repos.queueRepo.findByShipmentAndCarrier(shipmentId, carrierId),
    repos.proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId),
  ])
  if (!queueEntry && !proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }

  return { success: true, shipment }
}
