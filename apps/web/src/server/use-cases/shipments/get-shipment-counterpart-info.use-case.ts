import type { CarrierProfileRepository } from '../../repositories/carrier-profile.repository'
import type { CustomerProfileRepository } from '../../repositories/customer-profile.repository'
import type { ProposalRepository } from '../../repositories/proposal.repository'
import type { ReviewRepository } from '../../repositories/review.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'
import type { UserRepository } from '../../repositories/user.repository'
import { resolveSafetyParticipant } from './safety/resolve-safety-participant'

export interface ShipmentCounterpartInfo {
  fullName: string
  avgRating: number | null
  phone: string | null
  // Achado #10 da QA momento-zero — badge de tag mais votada, vale pros dois
  // sentidos (customer vê do carrier, carrier vê do customer).
  topTagLabel: string | null
}

export type GetShipmentCounterpartInfoResult =
  | { success: true; info: ShipmentCounterpartInfo | null }
  | { success: false; code: 'NOT_FOUND' }

interface GetShipmentCounterpartInfoRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  carrierProfileRepo: CarrierProfileRepository
  userRepo: UserRepository
  reviewRepo: ReviewRepository
}

// Item #1 do review de referências (Metrobi) — cartão de contato da
// contraparte assim que o transportador é selecionado. Decisão registrada em
// docs/decisions.md (D-007): nome + nota sempre visíveis, telefone só depois
// de um clique explícito ("Mostrar telefone") no client — não há mascaramento
// no backend porque a query já é escopada ao dono/transportador do frete.
const REVEALED_STATUSES = [
  'CARRIER_SELECTED',
  'COLLECTED',
  'IN_TRANSIT',
  'DELIVERED',
  'REVIEWED',
]

export async function getShipmentCounterpartInfo(
  repos: GetShipmentCounterpartInfoRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
): Promise<GetShipmentCounterpartInfoResult> {
  const participant = await resolveSafetyParticipant(
    repos,
    userId,
    principalRole,
    shipmentId,
  )
  if (!participant) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (!REVEALED_STATUSES.includes(participant.status)) {
    return { success: true, info: null }
  }

  if (principalRole === 'CUSTOMER') {
    const accepted = await repos.proposalRepo.findAcceptedByShipment(shipmentId)
    if (!accepted) return { success: true, info: null }

    const carrierUser = await repos.userRepo.findById(accepted.carrierId)
    if (!carrierUser) return { success: true, info: null }

    const [contact, topTag] = await Promise.all([
      repos.carrierProfileRepo.findContactInfoByUserId(accepted.carrierId),
      repos.reviewRepo.findTopTagByReviewee(accepted.carrierId),
    ])
    return {
      success: true,
      info: {
        fullName: carrierUser.fullName,
        avgRating: contact?.avgRating ?? null,
        phone: contact?.phone ?? null,
        topTagLabel: topTag?.label ?? null,
      },
    }
  }

  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (!shipment) return { success: true, info: null }

  const customerProfile = await repos.customerProfileRepo.findUserIdById(
    shipment.customerId,
  )
  if (!customerProfile) return { success: true, info: null }

  const customerUser = await repos.userRepo.findById(customerProfile.userId)
  if (!customerUser) return { success: true, info: null }

  const [contact, topTag] = await Promise.all([
    repos.customerProfileRepo.findContactInfoByUserId(customerProfile.userId),
    repos.reviewRepo.findTopTagByReviewee(customerProfile.userId),
  ])
  return {
    success: true,
    info: {
      fullName: customerUser.fullName,
      avgRating: contact?.avgRating ?? null,
      phone: contact?.phone ?? null,
      topTagLabel: topTag?.label ?? null,
    },
  }
}
