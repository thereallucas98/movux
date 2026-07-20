import type {
  CarrierDocument,
  CarrierDocumentType,
  PrismaClient,
  VerificationStatus,
} from '~/generated/prisma/client'

export interface CreateCarrierDocumentInput {
  carrierId: string
  type: CarrierDocumentType
  fileUrl: string
}

export interface ListCarrierDocumentsFilter {
  status?: VerificationStatus
  cursor?: string
  limit?: number
}

/**
 * provider distinguishes a manual admin check (today) from a future paid
 * automated provider (e.g. BIGDATACORP, not implemented yet) — same field,
 * same envelope shape family, no schema change needed when that's added.
 */
export type ExternalValidationEnvelope = {
  provider: 'MANUAL'
  result: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE'
  notes?: string
  checkedBy: string
  checkedAt: string
}

export interface CarrierDocumentRepository {
  create(data: CreateCarrierDocumentInput): Promise<CarrierDocument>
  findByCarrier(carrierId: string): Promise<CarrierDocument[]>
  findById(id: string): Promise<CarrierDocument | null>
  updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    rejectionReason?: string,
  ): Promise<void>
  findApprovedTypesByCarrier(carrierId: string): Promise<CarrierDocumentType[]>
  findByStatus(
    filter: ListCarrierDocumentsFilter,
  ): Promise<{ data: CarrierDocument[]; nextCursor: string | null }>
  recordExternalValidation(id: string, envelope: ExternalValidationEnvelope): Promise<void>
}

export function createCarrierDocumentRepository(
  prisma: PrismaClient,
): CarrierDocumentRepository {
  return {
    async create(data) {
      return prisma.carrierDocument.create({ data })
    },

    async findByCarrier(carrierId) {
      return prisma.carrierDocument.findMany({
        where: { carrierId },
        orderBy: { uploadedAt: 'desc' },
      })
    },

    async findById(id) {
      return prisma.carrierDocument.findUnique({ where: { id } })
    },

    async updateStatus(id, status, reviewedBy, rejectionReason) {
      await prisma.carrierDocument.update({
        where: { id },
        data: { status, reviewedBy, reviewedAt: new Date(), rejectionReason },
      })
    },

    async findApprovedTypesByCarrier(carrierId) {
      const rows = await prisma.carrierDocument.findMany({
        where: { carrierId, status: 'APPROVED' },
        distinct: ['type'],
        select: { type: true },
      })
      return rows.map((row) => row.type)
    },

    async findByStatus(filter) {
      const limit = filter.limit ?? 20
      const data = await prisma.carrierDocument.findMany({
        where: filter.status ? { status: filter.status } : {},
        orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      })

      const hasMore = data.length > limit
      const page = hasMore ? data.slice(0, limit) : data
      const nextCursor = hasMore ? page[page.length - 1].id : null

      return { data: page, nextCursor }
    },

    async recordExternalValidation(id, envelope) {
      await prisma.carrierDocument.update({
        where: { id },
        data: { externalValidation: envelope },
      })
    },
  }
}
