import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export type ShiftCandidateStatus =
  | 'QUEUED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'

export interface ShiftCandidateRow {
  id: string
  shiftId: string
  userId: string
  queuePosition: number
  status: ShiftCandidateStatus
  decidedByUserId: string | null
  decidedAt: Date | null
  decisionReason: string | null
  resultingAssignmentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ShiftCandidateWithJoinsRow extends ShiftCandidateRow {
  shift: {
    id: string
    scheduleId: string
    categoryId: string
    startAt: Date
    endAt: Date
    headcount: number
    status: string
    decisionWindowHours: number
    assignmentMode: string
    schedule: { workspaceId: string; status: string }
  }
}

export interface ShiftCandidateRepository {
  create(
    data: {
      shiftId: string
      userId: string
      queuePosition: number
    },
    tx?: DbClient,
  ): Promise<ShiftCandidateRow>

  findById(id: string, tx?: DbClient): Promise<ShiftCandidateRow | null>

  findByIdWithJoins(
    id: string,
    tx?: DbClient,
  ): Promise<ShiftCandidateWithJoinsRow | null>

  findActiveByShiftAndUser(
    shiftId: string,
    userId: string,
    tx?: DbClient,
  ): Promise<ShiftCandidateRow | null>

  listForShift(
    shiftId: string,
    filter?: { status?: ShiftCandidateStatus },
    tx?: DbClient,
  ): Promise<ShiftCandidateRow[]>

  countByShift(
    shiftId: string,
    statuses?: ShiftCandidateStatus[],
    tx?: DbClient,
  ): Promise<number>

  countQueuedByShiftIds(
    shiftIds: string[],
    tx?: DbClient,
  ): Promise<Map<string, number>>

  /** Total QUEUED candidates across all active shifts in a workspace. */
  countQueuedForWorkspace(workspaceId: string, tx?: DbClient): Promise<number>

  nextQueuePosition(shiftId: string, tx?: DbClient): Promise<number>

  update(
    id: string,
    data: Partial<{
      status: ShiftCandidateStatus
      decidedByUserId: string | null
      decidedAt: Date | null
      decisionReason: string | null
      resultingAssignmentId: string | null
    }>,
    tx?: DbClient,
  ): Promise<ShiftCandidateRow>

  /**
   * Atomic update: only applies if current status is QUEUED. Returns count
   * (0 = race lost / not QUEUED, 1 = updated).
   */
  updateIfQueued(
    id: string,
    data: {
      status: ShiftCandidateStatus
      decidedByUserId: string
      decidedAt: Date
      decisionReason?: string | null
      resultingAssignmentId?: string | null
    },
    tx?: DbClient,
  ): Promise<{ count: number }>
}

const CANDIDATE_SELECT = {
  id: true,
  shiftId: true,
  userId: true,
  queuePosition: true,
  status: true,
  decidedByUserId: true,
  decidedAt: true,
  decisionReason: true,
  resultingAssignmentId: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createShiftCandidateRepository(
  prisma: PrismaClient,
): ShiftCandidateRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.shiftCandidate.create({
        data: {
          shiftId: data.shiftId,
          userId: data.userId,
          queuePosition: data.queuePosition,
        },
        select: CANDIDATE_SELECT,
      }) as Promise<ShiftCandidateRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.shiftCandidate.findUnique({
        where: { id },
        select: CANDIDATE_SELECT,
      }) as Promise<ShiftCandidateRow | null>
    },

    async findByIdWithJoins(id, tx) {
      const db = tx ?? prisma
      const row = await db.shiftCandidate.findUnique({
        where: { id },
        select: {
          ...CANDIDATE_SELECT,
          shift: {
            select: {
              id: true,
              scheduleId: true,
              categoryId: true,
              startAt: true,
              endAt: true,
              headcount: true,
              status: true,
              decisionWindowHours: true,
              assignmentMode: true,
              schedule: { select: { workspaceId: true, status: true } },
            },
          },
        },
      })
      return row as ShiftCandidateWithJoinsRow | null
    },

    async findActiveByShiftAndUser(shiftId, userId, tx) {
      const db = tx ?? prisma
      return db.shiftCandidate.findFirst({
        where: {
          shiftId,
          userId,
          status: { in: ['QUEUED', 'APPROVED', 'REJECTED'] },
        },
        select: CANDIDATE_SELECT,
      }) as Promise<ShiftCandidateRow | null>
    },

    async listForShift(shiftId, filter, tx) {
      const db = tx ?? prisma
      return db.shiftCandidate.findMany({
        where: {
          shiftId,
          ...(filter?.status && { status: filter.status }),
        },
        orderBy: { queuePosition: 'asc' },
        take: 200,
        select: CANDIDATE_SELECT,
      }) as Promise<ShiftCandidateRow[]>
    },

    async countByShift(shiftId, statuses, tx) {
      const db = tx ?? prisma
      return db.shiftCandidate.count({
        where: {
          shiftId,
          ...(statuses && statuses.length > 0 && { status: { in: statuses } }),
        },
      })
    },

    async countQueuedByShiftIds(shiftIds, tx) {
      const db = tx ?? prisma
      const map = new Map<string, number>()
      if (shiftIds.length === 0) return map
      const grouped = await db.shiftCandidate.groupBy({
        by: ['shiftId'],
        where: { shiftId: { in: shiftIds }, status: 'QUEUED' },
        _count: { _all: true },
      })
      for (const g of grouped) map.set(g.shiftId, g._count._all)
      return map
    },

    async nextQueuePosition(shiftId, tx) {
      const db = tx ?? prisma
      const result = await db.shiftCandidate.aggregate({
        where: { shiftId },
        _max: { queuePosition: true },
      })
      return (result._max.queuePosition ?? 0) + 1
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.shiftCandidate.update({
        where: { id },
        data,
        select: CANDIDATE_SELECT,
      }) as Promise<ShiftCandidateRow>
    },

    async updateIfQueued(id, data, tx) {
      const db = tx ?? prisma
      const result = await db.shiftCandidate.updateMany({
        where: { id, status: 'QUEUED' },
        data: {
          status: data.status,
          decidedByUserId: data.decidedByUserId,
          decidedAt: data.decidedAt,
          ...(data.decisionReason !== undefined && {
            decisionReason: data.decisionReason,
          }),
          ...(data.resultingAssignmentId !== undefined && {
            resultingAssignmentId: data.resultingAssignmentId,
          }),
        },
      })
      return { count: result.count }
    },

    async countQueuedForWorkspace(workspaceId, tx) {
      const db = tx ?? prisma
      return db.shiftCandidate.count({
        where: {
          status: 'QUEUED',
          shift: { schedule: { workspaceId } },
        },
      })
    },
  }
}
