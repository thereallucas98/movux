import { CarrierCalled } from '~/lib/email/templates/carrier-called'
import { sendEmailNotification } from '../../../notifications/send-email-notification'
import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type { UserRepository } from '../../../repositories/user.repository'

const CALL_GROUP_SIZE = 3

/**
 * Synchronous "hybrid" queue advance — no background job. Called from any
 * use-case that can free or fill a CALLED slot (join, withdraw, and later
 * S2-T2/S2-T3 when an entry becomes EXHAUSTED). Notifies each newly-called
 * carrier by email (best-effort, never throws).
 */
export async function refillCalledGroup(
  queueRepo: ProposalQueueRepository,
  userRepo: UserRepository,
  notificationLogRepo: NotificationLogRepository,
  shipmentId: string,
): Promise<void> {
  const calledCount = await queueRepo.countCalledByShipment(shipmentId)
  const slots = CALL_GROUP_SIZE - calledCount
  if (slots <= 0) return

  const nextWaiting = await queueRepo.findNextWaiting(shipmentId, slots)
  if (nextWaiting.length === 0) return

  await queueRepo.markManyCalled(nextWaiting.map((entry) => entry.id))

  for (const entry of nextWaiting) {
    const carrier = await userRepo.findById(entry.carrierId)
    if (!carrier) continue

    await sendEmailNotification(notificationLogRepo, {
      userId: carrier.id,
      to: carrier.email,
      subject: 'Você foi chamado para propor — Movux',
      react: CarrierCalled({ carrierName: carrier.fullName }),
      templateCode: 'CARRIER_CALLED',
    })
  }
}
