import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ShiftExpectedCompositionRow {
  id: string
  shiftId: string
  specialtyId: string
  count: number
  createdAt: Date
  updatedAt: Date
}

export interface ShiftExpectedCompositionRepository {
  findByShift(
    shiftId: string,
    tx?: DbClient,
  ): Promise<ShiftExpectedCompositionRow[]>

  listForSchedule(
    scheduleId: string,
    tx?: DbClient,
  ): Promise<{ shiftId: string; specialtyId: string; count: number }[]>

  deleteAllForShift(shiftId: string, tx?: DbClient): Promise<void>

  createMany(
    items: { shiftId: string; specialtyId: string; count: number }[],
    tx?: DbClient,
  ): Promise<{ count: number }>

  countActiveBySpecialty(specialtyId: string, tx?: DbClient): Promise<number>
}

const COMPOSITION_SELECT = {
  id: true,
  shiftId: true,
  specialtyId: true,
  count: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createShiftExpectedCompositionRepository(
  prisma: PrismaClient,
): ShiftExpectedCompositionRepository {
  return {
    async findByShift(shiftId, tx) {
      const db = tx ?? prisma
      return db.shiftExpectedComposition.findMany({
        where: { shiftId },
        orderBy: { createdAt: 'asc' },
        select: COMPOSITION_SELECT,
      }) as Promise<ShiftExpectedCompositionRow[]>
    },

    async listForSchedule(scheduleId, tx) {
      const db = tx ?? prisma
      return db.shiftExpectedComposition.findMany({
        where: { shift: { scheduleId } },
        select: { shiftId: true, specialtyId: true, count: true },
      })
    },

    async deleteAllForShift(shiftId, tx) {
      const db = tx ?? prisma
      await db.shiftExpectedComposition.deleteMany({ where: { shiftId } })
    },

    async createMany(items, tx) {
      const db = tx ?? prisma
      if (items.length === 0) return { count: 0 }
      const result = await db.shiftExpectedComposition.createMany({
        data: items,
      })
      return { count: result.count }
    },

    async countActiveBySpecialty(specialtyId, tx) {
      const db = tx ?? prisma
      return db.shiftExpectedComposition.count({ where: { specialtyId } })
    },
  }
}
