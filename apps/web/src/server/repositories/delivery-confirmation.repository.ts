import type { DeliveryConfirmation, PrismaClient } from '~/generated/prisma/client'

export interface DeliveryConfirmationRepository {
  findByShipment(shipmentId: string): Promise<DeliveryConfirmation | null>
  create(
    shipmentId: string,
    customerId: string,
    confirmed: boolean,
    issueDescription?: string,
  ): Promise<DeliveryConfirmation>
}

export function createDeliveryConfirmationRepository(
  prisma: PrismaClient,
): DeliveryConfirmationRepository {
  return {
    async findByShipment(shipmentId) {
      return prisma.deliveryConfirmation.findUnique({ where: { shipmentId } })
    },

    async create(shipmentId, customerId, confirmed, issueDescription) {
      return prisma.deliveryConfirmation.create({
        data: { shipmentId, customerId, confirmed, issueDescription },
      })
    },
  }
}
