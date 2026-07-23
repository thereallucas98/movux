import type {
  PrismaClient,
  ReviewerRole,
  SafetyCheckIn,
} from '~/generated/prisma/client'

export interface SafetyCheckInRepository {
  findByShipment(shipmentId: string): Promise<SafetyCheckIn[]>
  findByShipmentAndRole(
    shipmentId: string,
    role: ReviewerRole,
  ): Promise<SafetyCheckIn | null>
  create(
    shipmentId: string,
    userId: string,
    role: ReviewerRole,
    ipAddress: string | null,
  ): Promise<SafetyCheckIn>
}

export function createSafetyCheckInRepository(
  prisma: PrismaClient,
): SafetyCheckInRepository {
  return {
    async findByShipment(shipmentId) {
      return prisma.safetyCheckIn.findMany({ where: { shipmentId } })
    },

    async findByShipmentAndRole(shipmentId, role) {
      return prisma.safetyCheckIn.findUnique({
        where: { shipmentId_role: { shipmentId, role } },
      })
    },

    async create(shipmentId, userId, role, ipAddress) {
      return prisma.safetyCheckIn.create({
        data: { shipmentId, userId, role, ipAddress },
      })
    },
  }
}
