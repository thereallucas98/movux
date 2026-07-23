import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type {
  ProposalQueueRepository,
  QueueEntry,
} from '../../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { sweepExpiredProposals } from '../proposals/sweep-expired-proposals'
import { refillCalledGroup } from './refill-called-group'

export type JoinProposalQueueResult =
  | { success: true; entry: QueueEntry }
  | {
      success: false
      code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'ALREADY_IN_QUEUE'
    }

interface JoinProposalQueueRepos {
  shipmentRepo: ShipmentRepository
  queueRepo: ProposalQueueRepository
  proposalRepo: ProposalRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function joinProposalQueue(
  repos: JoinProposalQueueRepos,
  carrierId: string,
  shipmentId: string,
): Promise<JoinProposalQueueResult> {
  await sweepExpiredProposals(
    repos.proposalRepo,
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (shipment.status !== 'OPEN' && shipment.status !== 'PROPOSALS_RECEIVED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const existing = await repos.queueRepo.findByShipmentAndCarrier(
    shipmentId,
    carrierId,
  )
  if (existing) {
    if (existing.status !== 'WITHDRAWN') {
      return { success: false, code: 'ALREADY_IN_QUEUE' }
    }
    // Achado #18 da QA momento-zero: "Sair da fila" antes de propor deve
    // permitir reentrada enquanto o frete continuar aberto. Só bloqueia se
    // o carrier já chegou a propor e desistiu (`withdrawProposal` também
    // marca a entrada da fila como WITHDRAWN) — nesse caso não é reentrada
    // "do zero", é desistência de proposta, fora do escopo desse achado.
    const proposal = await repos.proposalRepo.findByShipmentAndCarrier(
      shipmentId,
      carrierId,
    )
    if (proposal) {
      return { success: false, code: 'ALREADY_IN_QUEUE' }
    }
  }

  const position = (await repos.queueRepo.countByShipment(shipmentId)) + 1
  if (existing) {
    // Reentrada depois de "Sair da fila" (achado #18) — reativa a entrada
    // WITHDRAWN em vez de criar uma nova (unique constraint em
    // [shipmentId, carrierId] não permitiria uma segunda linha).
    await repos.queueRepo.reactivate(existing.id, position)
  } else {
    await repos.queueRepo.create(shipmentId, carrierId, position)
  }

  await refillCalledGroup(
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  const entry = await repos.queueRepo.findByShipmentAndCarrier(
    shipmentId,
    carrierId,
  )
  return { success: true, entry: entry as QueueEntry }
}
