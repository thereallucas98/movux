import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import {
  decodeCursor,
  encodeCursor,
  isCreatedAtCursor,
} from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ClockLocation {
  lat: number
  lng: number
}

export interface TimeEntryRow {
  id: string
  shiftAssignmentId: string
  userId: string
  clockInAt: Date
  clockInLocation: ClockLocation | null
  clockInWithinTolerance: boolean
  clockOutAt: Date | null
  clockOutLocation: ClockLocation | null
  clockOutWithinTolerance: boolean | null
  overtimeMinutes: number
  closedByUserId: string | null
  closedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TimeEntryWithJoinsRow extends TimeEntryRow {
  shiftAssignment: {
    id: string
    shiftId: string
    userId: string | null
    status: string
    shift: {
      id: string
      scheduleId: string
      startAt: Date
      endAt: Date
      schedule: { workspaceId: string }
    }
    user: { id: string; fullName: string } | null
  }
}

export interface ListTimeEntriesFilter {
  workspaceId: string
  from: Date
  to: Date
  userId?: string
}

export interface CreateTimeEntryInput {
  shiftAssignmentId: string
  userId: string
  clockInAt: Date
  clockInLocation?: ClockLocation | null
  clockInWithinTolerance: boolean
}

export interface UpdateTimeEntryInput {
  clockOutAt?: Date | null
  clockOutLocation?: ClockLocation | null
  clockOutWithinTolerance?: boolean | null
  overtimeMinutes?: number
  closedByUserId?: string | null
  closedAt?: Date | null
  notes?: string | null
}

export interface TimeEntryRepository {
  create(input: CreateTimeEntryInput, tx?: DbClient): Promise<TimeEntryRow>

  findByAssignmentId(
    shiftAssignmentId: string,
    tx?: DbClient,
  ): Promise<TimeEntryRow | null>

  update(
    id: string,
    data: UpdateTimeEntryInput,
    tx?: DbClient,
  ): Promise<TimeEntryRow>

  findLastClockOutBefore(
    input: { userId: string; before: Date },
    tx?: DbClient,
  ): Promise<Date | null>

  sumHoursForUserInWeek(
    input: { userId: string; anchor: Date },
    tx?: DbClient,
  ): Promise<number>

  listForWorkspace(
    filter: ListTimeEntriesFilter,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<TimeEntryWithJoinsRow>>

  countForWorkspace(
    filter: ListTimeEntriesFilter,
    tx?: DbClient,
  ): Promise<number>
}

const TIME_ENTRY_SELECT = {
  id: true,
  shiftAssignmentId: true,
  userId: true,
  clockInAt: true,
  clockInLocation: true,
  clockInWithinTolerance: true,
  clockOutAt: true,
  clockOutLocation: true,
  clockOutWithinTolerance: true,
  overtimeMinutes: true,
  closedByUserId: true,
  closedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

const TIME_ENTRY_JOINS_SELECT = {
  ...TIME_ENTRY_SELECT,
  shiftAssignment: {
    select: {
      id: true,
      shiftId: true,
      userId: true,
      status: true,
      shift: {
        select: {
          id: true,
          scheduleId: true,
          startAt: true,
          endAt: true,
          schedule: { select: { workspaceId: true } },
        },
      },
      user: { select: { id: true, fullName: true } },
    },
  },
} as const

/** Returns the Monday 00:00:00.000 UTC for the week containing `anchor`. */
function startOfWeekUtc(anchor: Date): Date {
  const d = new Date(anchor.getTime())
  const day = d.getUTCDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysSinceMonday = (day + 6) % 7
  d.setUTCDate(d.getUTCDate() - daysSinceMonday)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function createTimeEntryRepository(
  prisma: PrismaClient,
): TimeEntryRepository {
  return {
    async create(input, tx) {
      const db = tx ?? prisma
      return db.timeEntry.create({
        data: {
          shiftAssignmentId: input.shiftAssignmentId,
          userId: input.userId,
          clockInAt: input.clockInAt,
          clockInWithinTolerance: input.clockInWithinTolerance,
          ...(input.clockInLocation !== undefined && {
            clockInLocation:
              input.clockInLocation as unknown as Prisma.InputJsonValue,
          }),
        },
        select: TIME_ENTRY_SELECT,
      }) as unknown as Promise<TimeEntryRow>
    },

    async findByAssignmentId(shiftAssignmentId, tx) {
      const db = tx ?? prisma
      return db.timeEntry.findUnique({
        where: { shiftAssignmentId },
        select: TIME_ENTRY_SELECT,
      }) as unknown as Promise<TimeEntryRow | null>
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      const sanitized: Record<string, unknown> = {}
      if (data.clockOutAt !== undefined) sanitized.clockOutAt = data.clockOutAt
      if (data.clockOutLocation !== undefined) {
        sanitized.clockOutLocation =
          data.clockOutLocation as unknown as Prisma.InputJsonValue
      }
      if (data.clockOutWithinTolerance !== undefined) {
        sanitized.clockOutWithinTolerance = data.clockOutWithinTolerance
      }
      if (data.overtimeMinutes !== undefined) {
        sanitized.overtimeMinutes = data.overtimeMinutes
      }
      if (data.closedByUserId !== undefined) {
        sanitized.closedByUserId = data.closedByUserId
      }
      if (data.closedAt !== undefined) sanitized.closedAt = data.closedAt
      if (data.notes !== undefined) sanitized.notes = data.notes

      return db.timeEntry.update({
        where: { id },
        data: sanitized,
        select: TIME_ENTRY_SELECT,
      }) as unknown as Promise<TimeEntryRow>
    },

    async findLastClockOutBefore(input, tx) {
      const db = tx ?? prisma
      const row = await db.timeEntry.findFirst({
        where: {
          userId: input.userId,
          clockOutAt: { not: null, lt: input.before },
        },
        orderBy: { clockOutAt: 'desc' },
        select: { clockOutAt: true },
      })
      return row?.clockOutAt ?? null
    },

    async sumHoursForUserInWeek(input, tx) {
      const db = tx ?? prisma
      const weekStart = startOfWeekUtc(input.anchor)
      const rows = await db.$queryRaw<{ total_seconds: number | null }[]>`
        SELECT COALESCE(
          SUM(
            EXTRACT(EPOCH FROM ("clock_out_at" - "clock_in_at"))
          ),
          0
        )::float AS total_seconds
        FROM "timeEntry"
        WHERE "user_id" = ${input.userId}
          AND "clock_out_at" IS NOT NULL
          AND "clock_in_at" >= ${weekStart}
          AND "clock_in_at" < ${input.anchor}
      `
      const seconds = rows[0]?.total_seconds ?? 0
      return seconds / 3600
    },

    async listForWorkspace(filter, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor, isCreatedAtCursor)
      const where: Prisma.TimeEntryWhereInput = {
        clockInAt: { gte: filter.from, lt: filter.to },
        ...(filter.userId && { userId: filter.userId }),
        shiftAssignment: {
          shift: { schedule: { workspaceId: filter.workspaceId } },
        },
        ...(decoded && {
          OR: [
            { createdAt: { lt: new Date(decoded.createdAt) } },
            {
              createdAt: new Date(decoded.createdAt),
              id: { lt: decoded.id },
            },
          ],
        }),
      }
      const items = await db.timeEntry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: TIME_ENTRY_JOINS_SELECT,
      })
      const hasMore = items.length > limit
      const data = hasMore ? items.slice(0, limit) : items
      const last = data[data.length - 1]
      const nextCursor: string | null =
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null
      return {
        data: data as unknown as TimeEntryWithJoinsRow[],
        nextCursor,
      }
    },

    async countForWorkspace(filter, tx) {
      const db = tx ?? prisma
      return db.timeEntry.count({
        where: {
          clockInAt: { gte: filter.from, lt: filter.to },
          ...(filter.userId && { userId: filter.userId }),
          shiftAssignment: {
            shift: { schedule: { workspaceId: filter.workspaceId } },
          },
        },
      })
    },
  }
}
