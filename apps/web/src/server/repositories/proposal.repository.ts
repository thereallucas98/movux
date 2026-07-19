import type {
  PrismaClient,
  Proposal,
  ProposalAttempt,
  ProposalStatus,
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
  }
}
