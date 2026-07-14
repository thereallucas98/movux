import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ShiftPatternRow {
  id: string
  scheduleId: string
  categoryId: string
  name: string | null
  daysOfWeek: number[]
  startTimeMinutes: number
  endTimeMinutes: number
  crossesMidnight: boolean
  headcount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ShiftPatternRepository {
  create(
    data: {
      scheduleId: string
      categoryId: string
      name?: string | null
      daysOfWeek: number[]
      startTimeMinutes: number
      endTimeMinutes: number
      crossesMidnight: boolean
      headcount: number
    },
    tx?: DbClient,
  ): Promise<ShiftPatternRow>

  findById(id: string, tx?: DbClient): Promise<ShiftPatternRow | null>

  listForSchedule(scheduleId: string, tx?: DbClient): Promise<ShiftPatternRow[]>
}

const PATTERN_SELECT = {
  id: true,
  scheduleId: true,
  categoryId: true,
  name: true,
  daysOfWeek: true,
  startTimeMinutes: true,
  endTimeMinutes: true,
  crossesMidnight: true,
  headcount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createShiftPatternRepository(
  prisma: PrismaClient,
): ShiftPatternRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.shiftPattern.create({
        data: {
          scheduleId: data.scheduleId,
          categoryId: data.categoryId,
          ...(data.name !== undefined && { name: data.name }),
          daysOfWeek: data.daysOfWeek,
          startTimeMinutes: data.startTimeMinutes,
          endTimeMinutes: data.endTimeMinutes,
          crossesMidnight: data.crossesMidnight,
          headcount: data.headcount,
        },
        select: PATTERN_SELECT,
      }) as Promise<ShiftPatternRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.shiftPattern.findUnique({
        where: { id },
        select: PATTERN_SELECT,
      }) as Promise<ShiftPatternRow | null>
    },

    async listForSchedule(scheduleId, tx) {
      const db = tx ?? prisma
      return db.shiftPattern.findMany({
        where: { scheduleId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: PATTERN_SELECT,
      }) as Promise<ShiftPatternRow[]>
    },
  }
}
