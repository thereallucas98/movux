import type { PrismaClient, QueueEntryStatus } from '~/generated/prisma/client'

export interface QueueEntry {
  id: string
  shipmentId: string
  carrierId: string
  status: QueueEntryStatus
  position: number
  calledAt: Date | null
  exhaustedAt: Date | null
}

export interface ProposalQueueRepository {
  findByShipmentAndCarrier(shipmentId: string, carrierId: string): Promise<QueueEntry | null>
  countByShipment(shipmentId: string): Promise<number>
  countCalledByShipment(shipmentId: string): Promise<number>
  findNextWaiting(shipmentId: string, limit: number): Promise<{ id: string }[]>
  create(shipmentId: string, carrierId: string, position: number): Promise<QueueEntry>
  updateStatus(id: string, status: QueueEntryStatus, calledAt?: Date): Promise<void>
  markManyCalled(ids: string[]): Promise<void>
}

export function createProposalQueueRepository(
  prisma: PrismaClient,
): ProposalQueueRepository {
  return {
    async findByShipmentAndCarrier(shipmentId, carrierId) {
      return prisma.proposalQueueEntry.findUnique({
        where: { shipmentId_carrierId: { shipmentId, carrierId } },
      })
    },

    async countByShipment(shipmentId) {
      return prisma.proposalQueueEntry.count({ where: { shipmentId } })
    },

    async countCalledByShipment(shipmentId) {
      return prisma.proposalQueueEntry.count({ where: { shipmentId, status: 'CALLED' } })
    },

    async findNextWaiting(shipmentId, limit) {
      return prisma.proposalQueueEntry.findMany({
        where: { shipmentId, status: 'WAITING' },
        orderBy: { position: 'asc' },
        take: limit,
        select: { id: true },
      })
    },

    async create(shipmentId, carrierId, position) {
      return prisma.proposalQueueEntry.create({
        data: { shipmentId, carrierId, position, status: 'WAITING' },
      })
    },

    async updateStatus(id, status, calledAt) {
      await prisma.proposalQueueEntry.update({
        where: { id },
        data: { status, ...(calledAt ? { calledAt } : {}) },
      })
    },

    async markManyCalled(ids) {
      if (ids.length === 0) return
      await prisma.proposalQueueEntry.updateMany({
        where: { id: { in: ids } },
        data: { status: 'CALLED', calledAt: new Date() },
      })
    },
  }
}
