import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSelectedCarrier } from './resolve-selected-carrier'

export type EtaStage = 'COLLECTION' | 'DELIVERY'

export type SetShipmentEtaResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface SetShipmentEtaRepos {
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
}

const ALLOWED_STATUS_BY_STAGE: Record<EtaStage, string> = {
  COLLECTION: 'CARRIER_SELECTED',
  DELIVERY: 'IN_TRANSIT',
}

// Achado #9 da QA momento-zero: ETA em duas etapas separadas do frete —
// coleta (enquanto `CARRIER_SELECTED`, antes de marcar coletado) e entrega
// (enquanto `IN_TRANSIT`, antes de marcar entregue).
export async function setShipmentEta(
  repos: SetShipmentEtaRepos,
  userId: string,
  shipmentId: string,
  stage: EtaStage,
  etaMinutes: number,
): Promise<SetShipmentEtaResult> {
  const carrier = await resolveSelectedCarrier(repos, userId, shipmentId)
  if (!carrier) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (carrier.status !== ALLOWED_STATUS_BY_STAGE[stage]) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.shipmentRepo.updateEta(shipmentId, stage, etaMinutes)

  return { success: true }
}
