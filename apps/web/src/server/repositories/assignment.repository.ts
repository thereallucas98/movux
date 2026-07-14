import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export type AssignmentStatus =
  | 'PENDING_ACCEPT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'TRANSFERRED'
  | 'PENDING_CLOSURE'
  | 'COMPLETED'

export interface AssignmentRow {
  id: string
  shiftId: string
  userId: string
  assignedByUserId: string
  status: AssignmentStatus
  decisionDeadline: Date
  decidedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AssignmentWithShiftRow extends AssignmentRow {
  shift: {
    id: string
    scheduleId: string
    categoryId: string
    startAt: Date
    endAt: Date
    headcount: number
    status: string
    assignmentMode: string
    schedule: { workspaceId: string; status: string }
  }
  openTimeEntry?: {
    id: string
    clockInAt: Date
    clockInWithinTolerance: boolean
    clockOutAt: Date | null
    clockOutWithinTolerance: boolean | null
    overtimeMinutes: number
    closedAt: Date | null
  } | null
}

export interface OverlappingAssignmentRow {
  shiftId: string
  startAt: Date
  endAt: Date
}

export interface AlternativeShiftRow {
  shiftId: string
  scheduleId: string
  startAt: Date
  endAt: Date
  categoryName: string
}

export interface AssignmentRepository {
  create(
    data: {
      shiftId: string
      userId: string
      assignedByUserId: string
      status: AssignmentStatus
      decisionDeadline: Date
      decidedAt?: Date | null
    },
    tx?: DbClient,
  ): Promise<AssignmentRow>

  findById(id: string, tx?: DbClient): Promise<AssignmentRow | null>

  findByIdWithShiftAndSchedule(
    id: string,
    tx?: DbClient,
  ): Promise<AssignmentWithShiftRow | null>

  listForShift(shiftId: string, tx?: DbClient): Promise<AssignmentRow[]>

  listForUser(
    userId: string,
    filters: { statuses: AssignmentStatus[]; from?: Date; to?: Date },
    tx?: DbClient,
  ): Promise<AssignmentWithShiftRow[]>

  listForUserInWorkspace(
    userId: string,
    workspaceId: string,
    statuses: AssignmentStatus[],
    tx?: DbClient,
  ): Promise<AssignmentWithShiftRow[]>

  listForSchedule(
    scheduleId: string,
    tx?: DbClient,
  ): Promise<
    Array<{
      shiftId: string
      userId: string
      status: AssignmentStatus
      decisionDeadline: Date
    }>
  >

  countByShiftAndStatus(
    shiftId: string,
    statuses: AssignmentStatus[],
    tx?: DbClient,
  ): Promise<number>

  findOverlappingForUser(
    input: {
      userId: string
      startAt: Date
      endAt: Date
      excludeShiftId?: string
    },
    tx?: DbClient,
  ): Promise<OverlappingAssignmentRow[]>

  findAlternativeShifts(
    input: {
      workspaceId: string
      categoryId: string
      targetShiftId: string
      userId: string
      limit: number
    },
    tx?: DbClient,
  ): Promise<AlternativeShiftRow[]>

  update(
    id: string,
    data: Partial<{
      status: AssignmentStatus
      decidedAt: Date | null
      rejectionReason: string | null
    }>,
    tx?: DbClient,
  ): Promise<AssignmentRow>

  hardDelete(id: string, tx?: DbClient): Promise<void>

  findActiveOnShiftForUser(
    shiftId: string,
    userId: string,
    tx?: DbClient,
  ): Promise<AssignmentRow | null>

  findForUserInRange(
    input: {
      userId: string
      workspaceId: string
      startAt: Date
      endAt: Date
      statuses: AssignmentStatus[]
    },
    tx?: DbClient,
  ): Promise<{ id: string; shiftId: string }[]>

  /**
   * Returns a `Map<shiftId, count>` of active assignments (those that occupy a
   * seat) for the given shift ids. Used by the dashboard to compute filled vs
   * expected headcount.
   */
  countActiveByShiftIds(
    shiftIds: string[],
    tx?: DbClient,
  ): Promise<Map<string, number>>

  /** Aggregate filled count across many shifts in one query — for KPI #2. */
  countActiveTotalForShiftIds(
    shiftIds: string[],
    tx?: DbClient,
  ): Promise<number>

  /**
   * Count ACCEPTED + REJECTED decisions in the workspace within a time window.
   * Used for the dashboard acceptance-rate KPI.
   */
  countDecidedInRange(
    input: { workspaceId: string; fromAt: Date; toAt: Date },
    tx?: DbClient,
  ): Promise<{ accepted: number; rejected: number }>

  /**
   * Find the principal's earliest upcoming ACCEPTED assignment in the
   * workspace. Returns null when the user has no future accepted shift.
   */
  findMyNextAcceptedInWorkspace(
    input: { userId: string; workspaceId: string; now: Date },
    tx?: DbClient,
  ): Promise<{
    id: string
    shiftId: string
    scheduleId: string
    categoryId: string
    startAt: Date
    endAt: Date
  } | null>
}

/** Statuses that count as "occupying a seat" on a shift. */
export const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'PENDING_ACCEPT',
  'ACCEPTED',
  'PENDING_CLOSURE',
  'COMPLETED',
]

const ASSIGNMENT_SELECT = {
  id: true,
  shiftId: true,
  userId: true,
  assignedByUserId: true,
  status: true,
  decisionDeadline: true,
  decidedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createAssignmentRepository(
  prisma: PrismaClient,
): AssignmentRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.shiftAssignment.create({
        data: {
          shiftId: data.shiftId,
          userId: data.userId,
          assignedByUserId: data.assignedByUserId,
          status: data.status,
          decisionDeadline: data.decisionDeadline,
          ...(data.decidedAt !== undefined && { decidedAt: data.decidedAt }),
        },
        select: ASSIGNMENT_SELECT,
      }) as Promise<AssignmentRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.shiftAssignment.findUnique({
        where: { id },
        select: ASSIGNMENT_SELECT,
      }) as Promise<AssignmentRow | null>
    },

    async findByIdWithShiftAndSchedule(id, tx) {
      const db = tx ?? prisma
      const row = await db.shiftAssignment.findUnique({
        where: { id },
        select: {
          ...ASSIGNMENT_SELECT,
          shift: {
            select: {
              id: true,
              scheduleId: true,
              categoryId: true,
              startAt: true,
              endAt: true,
              headcount: true,
              status: true,
              assignmentMode: true,
              schedule: {
                select: { workspaceId: true, status: true },
              },
            },
          },
        },
      })
      return row as AssignmentWithShiftRow | null
    },

    async listForShift(shiftId, tx) {
      const db = tx ?? prisma
      return db.shiftAssignment.findMany({
        where: { shiftId },
        orderBy: { createdAt: 'asc' },
        select: ASSIGNMENT_SELECT,
      }) as Promise<AssignmentRow[]>
    },

    async listForUser(userId, filters, tx) {
      const db = tx ?? prisma
      const rows = await db.shiftAssignment.findMany({
        where: {
          userId,
          status: { in: filters.statuses },
          ...(filters.from || filters.to
            ? {
                shift: {
                  startAt: {
                    ...(filters.from && { gte: filters.from }),
                    ...(filters.to && { lte: filters.to }),
                  },
                },
              }
            : {}),
        },
        orderBy: { shift: { startAt: 'asc' } },
        select: {
          ...ASSIGNMENT_SELECT,
          shift: {
            select: {
              id: true,
              scheduleId: true,
              categoryId: true,
              startAt: true,
              endAt: true,
              headcount: true,
              status: true,
              assignmentMode: true,
              schedule: {
                select: { workspaceId: true, status: true },
              },
            },
          },
          timeEntry: {
            select: {
              id: true,
              clockInAt: true,
              clockInWithinTolerance: true,
              clockOutAt: true,
              clockOutWithinTolerance: true,
              overtimeMinutes: true,
              closedAt: true,
            },
          },
        },
      })
      return rows.map((r) => {
        const { timeEntry, ...rest } = r
        return {
          ...rest,
          openTimeEntry: timeEntry ?? null,
        } as AssignmentWithShiftRow
      })
    },

    async listForUserInWorkspace(userId, workspaceId, statuses, tx) {
      const db = tx ?? prisma
      const rows = await db.shiftAssignment.findMany({
        where: {
          userId,
          status: { in: statuses },
          shift: { schedule: { workspaceId } },
        },
        orderBy: { decisionDeadline: 'asc' },
        select: {
          ...ASSIGNMENT_SELECT,
          shift: {
            select: {
              id: true,
              scheduleId: true,
              categoryId: true,
              startAt: true,
              endAt: true,
              headcount: true,
              status: true,
              assignmentMode: true,
              schedule: {
                select: { workspaceId: true, status: true },
              },
            },
          },
        },
      })
      return rows as AssignmentWithShiftRow[]
    },

    async listForSchedule(scheduleId, tx) {
      const db = tx ?? prisma
      const rows = await db.shiftAssignment.findMany({
        where: { shift: { scheduleId } },
        select: {
          shiftId: true,
          userId: true,
          status: true,
          decisionDeadline: true,
        },
      })
      return rows.filter(
        (r): r is typeof r & { userId: string } => r.userId !== null,
      )
    },

    async countByShiftAndStatus(shiftId, statuses, tx) {
      const db = tx ?? prisma
      return db.shiftAssignment.count({
        where: { shiftId, status: { in: statuses } },
      })
    },

    async findOverlappingForUser(input, tx) {
      const db = tx ?? prisma
      const rows = await db.shiftAssignment.findMany({
        where: {
          userId: input.userId,
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
          ...(input.excludeShiftId && {
            shiftId: { not: input.excludeShiftId },
          }),
          shift: {
            startAt: { lt: input.endAt },
            endAt: { gt: input.startAt },
          },
        },
        select: {
          shiftId: true,
          shift: { select: { startAt: true, endAt: true } },
        },
      })
      return rows.map((r) => ({
        shiftId: r.shiftId,
        startAt: r.shift.startAt,
        endAt: r.shift.endAt,
      }))
    },

    async findAlternativeShifts(input, tx) {
      const db = tx ?? prisma
      const rows = await db.$queryRaw<
        {
          shift_id: string
          schedule_id: string
          start_at: Date
          end_at: Date
          category_name: string
        }[]
      >`
        SELECT s.id AS shift_id,
               s.schedule_id AS schedule_id,
               s.start_at AS start_at,
               s.end_at AS end_at,
               c.name AS category_name
        FROM "shift" s
        JOIN "category" c ON c.id = s.category_id
        JOIN "schedule" sch ON sch.id = s.schedule_id
        WHERE sch.workspace_id = ${input.workspaceId}
          AND sch.status = 'PUBLISHED'
          AND s.category_id = ${input.categoryId}
          AND s.status = 'OPEN'
          AND s.id != ${input.targetShiftId}
          AND NOT EXISTS (
            SELECT 1 FROM "shiftAssignment" a
            JOIN "shift" os ON os.id = a.shift_id
            WHERE a.user_id = ${input.userId}
              AND a.status IN ('PENDING_ACCEPT', 'ACCEPTED')
              AND os.start_at < s.end_at
              AND os.end_at > s.start_at
          )
          AND (
            SELECT count(*) FROM "shiftAssignment" a2
            WHERE a2.shift_id = s.id
              AND a2.status IN ('PENDING_ACCEPT', 'ACCEPTED')
          ) < s.headcount
        ORDER BY s.start_at ASC
        LIMIT ${input.limit}
      `
      return rows.map((r) => ({
        shiftId: r.shift_id,
        scheduleId: r.schedule_id,
        startAt: r.start_at,
        endAt: r.end_at,
        categoryName: r.category_name,
      }))
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.shiftAssignment.update({
        where: { id },
        data,
        select: ASSIGNMENT_SELECT,
      }) as Promise<AssignmentRow>
    },

    async hardDelete(id, tx) {
      const db = tx ?? prisma
      await db.shiftAssignment.delete({ where: { id } })
    },

    async findActiveOnShiftForUser(shiftId, userId, tx) {
      const db = tx ?? prisma
      return db.shiftAssignment.findFirst({
        where: {
          shiftId,
          userId,
          status: {
            notIn: ['CANCELLED', 'TRANSFERRED', 'REJECTED', 'EXPIRED'],
          },
        },
        select: ASSIGNMENT_SELECT,
      }) as Promise<AssignmentRow | null>
    },

    async findForUserInRange(input, tx) {
      const db = tx ?? prisma
      const rows = await db.shiftAssignment.findMany({
        where: {
          userId: input.userId,
          status: { in: input.statuses },
          shift: {
            startAt: { lt: input.endAt },
            endAt: { gt: input.startAt },
            schedule: { workspaceId: input.workspaceId },
          },
        },
        select: { id: true, shiftId: true },
      })
      return rows
    },

    async countActiveByShiftIds(shiftIds, tx) {
      if (shiftIds.length === 0) return new Map()
      const db = tx ?? prisma
      const grouped = await db.shiftAssignment.groupBy({
        by: ['shiftId'],
        where: {
          shiftId: { in: shiftIds },
          status: { in: ACTIVE_ASSIGNMENT_STATUSES },
        },
        _count: { _all: true },
      })
      return new Map(grouped.map((g) => [g.shiftId, g._count._all]))
    },

    async countActiveTotalForShiftIds(shiftIds, tx) {
      if (shiftIds.length === 0) return 0
      const db = tx ?? prisma
      return db.shiftAssignment.count({
        where: {
          shiftId: { in: shiftIds },
          status: { in: ACTIVE_ASSIGNMENT_STATUSES },
        },
      })
    },

    async countDecidedInRange(input, tx) {
      const db = tx ?? prisma
      const grouped = await db.shiftAssignment.groupBy({
        by: ['status'],
        where: {
          status: { in: ['ACCEPTED', 'REJECTED'] },
          decidedAt: { gte: input.fromAt, lte: input.toAt },
          shift: { schedule: { workspaceId: input.workspaceId } },
        },
        _count: { _all: true },
      })
      const accepted =
        grouped.find((g) => g.status === 'ACCEPTED')?._count._all ?? 0
      const rejected =
        grouped.find((g) => g.status === 'REJECTED')?._count._all ?? 0
      return { accepted, rejected }
    },

    async findMyNextAcceptedInWorkspace(input, tx) {
      const db = tx ?? prisma
      const row = await db.shiftAssignment.findFirst({
        where: {
          userId: input.userId,
          status: 'ACCEPTED',
          shift: {
            startAt: { gte: input.now },
            schedule: { workspaceId: input.workspaceId },
          },
        },
        orderBy: { shift: { startAt: 'asc' } },
        select: {
          id: true,
          shiftId: true,
          shift: {
            select: {
              scheduleId: true,
              categoryId: true,
              startAt: true,
              endAt: true,
            },
          },
        },
      })
      if (!row) return null
      return {
        id: row.id,
        shiftId: row.shiftId,
        scheduleId: row.shift.scheduleId,
        categoryId: row.shift.categoryId,
        startAt: row.shift.startAt,
        endAt: row.shift.endAt,
      }
    },
  }
}
