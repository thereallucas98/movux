import type { DeliveryConfirmationRepository } from '../../../repositories/delivery-confirmation.repository'

const AUTO_CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000

interface DeliveredShipment {
  status: string
  deliveredAt: Date | null
  customerId: string
}

/**
 * Lazy auto-confirm — no background job exists yet (same pattern as
 * sweepExpiredProposals). Runs at the start of the delivery-confirmation
 * use-cases; if 24h have passed since deliveredAt with no manual
 * confirmation, creates a system one (confirmed: true).
 */
export async function sweepAutoConfirmDelivery(
  deliveryConfirmationRepo: DeliveryConfirmationRepository,
  shipmentId: string,
  shipment: DeliveredShipment,
): Promise<void> {
  if (shipment.status !== 'DELIVERED' || !shipment.deliveredAt) return

  const deadline = new Date(
    shipment.deliveredAt.getTime() + AUTO_CONFIRM_WINDOW_MS,
  )
  if (new Date() < deadline) return

  const existing = await deliveryConfirmationRepo.findByShipment(shipmentId)
  if (existing) return

  await deliveryConfirmationRepo.create(shipmentId, shipment.customerId, true)
}
