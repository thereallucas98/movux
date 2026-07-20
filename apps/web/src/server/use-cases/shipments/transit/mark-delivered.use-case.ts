import { DeliveryConfirmationRequest } from '~/lib/email/templates/delivery-confirmation-request'
import { sendEmailNotification } from '../../../notifications/send-email-notification'
import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentEventRepository } from '../../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { resolveSelectedCarrier } from './resolve-selected-carrier'

export type MarkDeliveredResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface MarkDeliveredRepos {
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  shipmentEventRepo: ShipmentEventRepository
  customerProfileRepo: CustomerProfileRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function markDelivered(
  repos: MarkDeliveredRepos,
  userId: string,
  shipmentId: string,
): Promise<MarkDeliveredResult> {
  const carrier = await resolveSelectedCarrier(repos, userId, shipmentId)
  if (!carrier) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (carrier.status !== 'IN_TRANSIT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.shipmentRepo.markDelivered(shipmentId)
  await repos.shipmentEventRepo.create(shipmentId, 'DELIVERED', userId)

  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (shipment) {
    const customer = await repos.customerProfileRepo.findUserIdById(shipment.customerId)
    if (customer) {
      const customerUser = await repos.userRepo.findById(customer.userId)
      if (customerUser) {
        await sendEmailNotification(repos.notificationLogRepo, {
          userId: customerUser.id,
          to: customerUser.email,
          subject: 'Seu frete foi entregue — Movux',
          react: DeliveryConfirmationRequest({
            customerName: customerUser.fullName,
            shipmentDescription: shipment.description,
          }),
          templateCode: 'DELIVERY_CONFIRMATION_REQUEST',
        })
      }
    }
  }

  return { success: true }
}
