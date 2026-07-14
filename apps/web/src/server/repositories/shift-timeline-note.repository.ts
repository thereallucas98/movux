import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ShiftTimelineNoteRow {
  id: string
  shiftId: string
  authorUserId: string
  note: string
  createdAt: Date
}

export interface ShiftTimelineNoteRepository {
  create(
    input: { shiftId: string; authorUserId: string; note: string },
    tx?: DbClient,
  ): Promise<ShiftTimelineNoteRow>
  findById(id: string, tx?: DbClient): Promise<ShiftTimelineNoteRow | null>
  listForShift(
    shiftId: string,
    input?: { since?: Date },
    tx?: DbClient,
  ): Promise<ShiftTimelineNoteRow[]>
}

const NOTE_SELECT = {
  id: true,
  shiftId: true,
  authorUserId: true,
  note: true,
  createdAt: true,
} as const

export function createShiftTimelineNoteRepository(
  prisma: PrismaClient,
): ShiftTimelineNoteRepository {
  return {
    async create(input, tx) {
      const db = tx ?? prisma
      return db.shiftTimelineNote.create({
        data: {
          shiftId: input.shiftId,
          authorUserId: input.authorUserId,
          note: input.note,
        },
        select: NOTE_SELECT,
      })
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.shiftTimelineNote.findUnique({
        where: { id },
        select: NOTE_SELECT,
      })
    },

    async listForShift(shiftId, input, tx) {
      const db = tx ?? prisma
      return db.shiftTimelineNote.findMany({
        where: {
          shiftId,
          ...(input?.since && { createdAt: { gte: input.since } }),
        },
        orderBy: { createdAt: 'asc' },
        select: NOTE_SELECT,
      })
    },
  }
}
