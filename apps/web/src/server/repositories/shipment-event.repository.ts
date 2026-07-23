import type {
  EventType,
  PrismaClient,
  ShipmentEvent,
} from '~/generated/prisma/client'

export interface ShipmentEventRepository {
  create(
    shipmentId: string,
    eventType: EventType,
    triggeredBy: string | null,
    metadata?: object,
  ): Promise<void>
  listByShipment(shipmentId: string): Promise<ShipmentEvent[]>
}

export function createShipmentEventRepository(
  prisma: PrismaClient,
): ShipmentEventRepository {
  return {
    async create(shipmentId, eventType, triggeredBy, metadata) {
      await prisma.shipmentEvent.create({
        data: { shipmentId, eventType, triggeredBy, metadata },
      })
    },

    async listByShipment(shipmentId) {
      return prisma.shipmentEvent.findMany({
        where: { shipmentId },
        orderBy: { occurredAt: 'asc' },
      })
    },
  }
}
