import type { PrismaClient, QueueEntryStatus } from '~/generated/prisma/client'
import type { BrowseShipmentItem } from './shipment.repository'
import { SHIPMENT_BROWSE_SELECT } from './shipment.repository'
import type { ProposalWithAttempts } from './proposal.repository'

export interface QueueEntry {
  id: string
  shipmentId: string
  carrierId: string
  status: QueueEntryStatus
  position: number
  calledAt: Date | null
  exhaustedAt: Date | null
}

export interface CarrierQueueEntryRow extends QueueEntry {
  shipment: BrowseShipmentItem
  proposal: ProposalWithAttempts | null
}

export interface ProposalQueueRepository {
  findByShipmentAndCarrier(
    shipmentId: string,
    carrierId: string,
  ): Promise<QueueEntry | null>
  countByShipment(shipmentId: string): Promise<number>
  countCalledByShipment(shipmentId: string): Promise<number>
  findNextWaiting(
    shipmentId: string,
    limit: number,
  ): Promise<{ id: string; carrierId: string }[]>
  create(
    shipmentId: string,
    carrierId: string,
    position: number,
  ): Promise<QueueEntry>
  updateStatus(
    id: string,
    status: QueueEntryStatus,
    calledAt?: Date,
  ): Promise<void>
  markManyCalled(ids: string[]): Promise<void>
  exhaustOthers(shipmentId: string, exceptQueueEntryId: string): Promise<void>
  listByCarrier(
    carrierId: string,
    filter: { cursor?: string; limit?: number },
  ): Promise<{ data: CarrierQueueEntryRow[]; nextCursor: string | null }>
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
      return prisma.proposalQueueEntry.count({
        where: { shipmentId, status: 'CALLED' },
      })
    },

    async findNextWaiting(shipmentId, limit) {
      return prisma.proposalQueueEntry.findMany({
        where: { shipmentId, status: 'WAITING' },
        orderBy: { position: 'asc' },
        take: limit,
        select: { id: true, carrierId: true },
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

    async exhaustOthers(shipmentId, exceptQueueEntryId) {
      await prisma.proposalQueueEntry.updateMany({
        where: {
          shipmentId,
          id: { not: exceptQueueEntryId },
          status: { in: ['WAITING', 'CALLED', 'ACTIVE'] },
        },
        data: { status: 'EXHAUSTED', exhaustedAt: new Date() },
      })
    },

    async listByCarrier(carrierId, filter) {
      const limit = filter.limit ?? 20
      const rows = await prisma.proposalQueueEntry.findMany({
        where: { carrierId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
        include: {
          shipment: { select: SHIPMENT_BROWSE_SELECT },
          proposal: {
            include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
          },
        },
      })

      const hasMore = rows.length > limit
      const page = hasMore ? rows.slice(0, limit) : rows
      const nextCursor = hasMore ? page[page.length - 1].id : null

      return { data: page, nextCursor }
    },
  }
}
