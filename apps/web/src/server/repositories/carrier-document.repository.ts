import type {
  CarrierDocument,
  CarrierDocumentType,
  PrismaClient,
} from '~/generated/prisma/client'

export interface CreateCarrierDocumentInput {
  carrierId: string
  type: CarrierDocumentType
  fileUrl: string
}

export interface CarrierDocumentRepository {
  create(data: CreateCarrierDocumentInput): Promise<CarrierDocument>
  findByCarrier(carrierId: string): Promise<CarrierDocument[]>
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
  }
}
