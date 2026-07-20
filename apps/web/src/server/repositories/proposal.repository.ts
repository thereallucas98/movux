import type {
  PrismaClient,
  Proposal,
  ProposalAttempt,
  ProposalStatus,
  ResponseType,
} from '~/generated/prisma/client'

export type ProposalWithAttempts = Proposal & { attempts: ProposalAttempt[] }

export interface CreateProposalInput {
  shipmentId: string
  carrierId: string
  queueEntryId: string
  customerSlaHours: number
  carrierSlaHours: number
  agreedSlaHours: number
  expiresAt: Date
  priceInCents: number
  message?: string
}

export interface ProposalRepository {
  findByShipmentAndCarrier(
    shipmentId: string,
    carrierId: string,
  ): Promise<ProposalWithAttempts | null>
  create(data: CreateProposalInput): Promise<ProposalWithAttempts>
  addAttempt(
    proposalId: string,
    attemptNumber: number,
    priceInCents: number,
    expiresAt: Date,
    message?: string,
  ): Promise<ProposalWithAttempts>
  updateStatus(id: string, status: ProposalStatus): Promise<void>
  findExpiredActiveByShipment(
    shipmentId: string,
  ): Promise<{ id: string; queueEntryId: string }[]>
  listByShipment(shipmentId: string): Promise<ProposalWithAttempts[]>
  findByIdForShipment(
    proposalId: string,
    shipmentId: string,
  ): Promise<ProposalWithAttempts | null>
  respondToAttempt(
    proposalId: string,
    attemptNumber: number,
    responseType: ResponseType,
  ): Promise<void>
  findOtherActiveByShipment(
    shipmentId: string,
    exceptProposalId: string,
  ): Promise<{ id: string; currentAttempt: number; queueEntryId: string }[]>
  findAcceptedByShipment(shipmentId: string): Promise<{ carrierId: string } | null>
}

export function createProposalRepository(prisma: PrismaClient): ProposalRepository {
  return {
    async findByShipmentAndCarrier(shipmentId, carrierId) {
      return prisma.proposal.findUnique({
        where: { shipmentId_carrierId: { shipmentId, carrierId } },
        include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
      })
    },

    async create(data) {
      return prisma.proposal.create({
        data: {
          shipmentId: data.shipmentId,
          carrierId: data.carrierId,
          queueEntryId: data.queueEntryId,
          customerSlaHours: data.customerSlaHours,
          carrierSlaHours: data.carrierSlaHours,
          agreedSlaHours: data.agreedSlaHours,
          expiresAt: data.expiresAt,
          currentAttempt: 1,
          attempts: {
            create: {
              attemptNumber: 1,
              priceInCents: data.priceInCents,
              message: data.message,
            },
          },
        },
        include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
      })
    },

    async addAttempt(proposalId, attemptNumber, priceInCents, expiresAt, message) {
      await prisma.$transaction([
        prisma.proposalAttempt.create({
          data: { proposalId, attemptNumber, priceInCents, message },
        }),
        prisma.proposal.update({
          where: { id: proposalId },
          data: { currentAttempt: attemptNumber, expiresAt },
        }),
      ])

      return prisma.proposal.findUniqueOrThrow({
        where: { id: proposalId },
        include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
      })
    },

    async updateStatus(id, status) {
      await prisma.proposal.update({ where: { id }, data: { status } })
    },

    async findExpiredActiveByShipment(shipmentId) {
      return prisma.proposal.findMany({
        where: { shipmentId, status: 'ACTIVE', expiresAt: { lt: new Date() } },
        select: { id: true, queueEntryId: true },
      })
    },

    async listByShipment(shipmentId) {
      return prisma.proposal.findMany({
        where: { shipmentId },
        include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      })
    },

    async findByIdForShipment(proposalId, shipmentId) {
      return prisma.proposal.findFirst({
        where: { id: proposalId, shipmentId },
        include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
      })
    },

    async respondToAttempt(proposalId, attemptNumber, responseType) {
      await prisma.proposalAttempt.updateMany({
        where: { proposalId, attemptNumber },
        data: { responseType, respondedAt: new Date() },
      })
    },

    async findOtherActiveByShipment(shipmentId, exceptProposalId) {
      return prisma.proposal.findMany({
        where: { shipmentId, status: 'ACTIVE', id: { not: exceptProposalId } },
        select: { id: true, currentAttempt: true, queueEntryId: true },
      })
    },

    async findAcceptedByShipment(shipmentId) {
      return prisma.proposal.findFirst({
        where: { shipmentId, status: 'ACCEPTED' },
        select: { carrierId: true },
      })
    },
  }
}
