import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import {
  decodeCursor,
  encodeCursor,
  isStartAtCursor,
} from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export type ShiftStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'

export type ShiftAssignmentMode = 'DIRECT_ASSIGN' | 'OPEN_FOR_APPLY'

export interface ShiftRow {
  id: string
  scheduleId: string
  categoryId: string
  patternId: string | null
  startAt: Date
  endAt: Date
  headcount: number
  status: ShiftStatus
  assignmentMode: ShiftAssignmentMode
  decisionWindowHours: number
  notes: string | null
  cancelledAt: Date | null
  cancelReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ListShiftsFilter {
  status?: ShiftStatus
  categoryId?: string
  fromAt?: Date
  toAt?: Date
}

export interface UpcomingShiftWithCategory extends ShiftRow {
  categoryName: string
}

export interface OpenShiftForUserRow {
  id: string
  scheduleId: string
  categoryId: string
  categoryName: string
  startAt: Date
  endAt: Date
  headcount: number
  activeAssignmentsCount: number
  myCandidacy: {
    id: string
    queuePosition: number
    status: 'QUEUED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  } | null
}

export interface ShiftRepository {
  create(
    data: {
      scheduleId: string
      categoryId: string
      patternId?: string | null
      startAt: Date
      endAt: Date
      headcount: number
      notes?: string | null
    },
    tx?: DbClient,
  ): Promise<ShiftRow>

  findById(id: string, tx?: DbClient): Promise<ShiftRow | null>

  update(
    id: string,
    data: Partial<{
      categoryId: string
      startAt: Date
      endAt: Date
      headcount: number
      notes: string | null
      status: ShiftStatus
      assignmentMode: ShiftAssignmentMode
      cancelledAt: Date | null
      cancelReason: string | null
    }>,
    tx?: DbClient,
  ): Promise<ShiftRow>

  hardDelete(id: string, tx?: DbClient): Promise<void>

  setStatus(
    id: string,
    status: ShiftStatus,
    extras: { cancelledAt?: Date | null; cancelReason?: string | null },
    tx?: DbClient,
  ): Promise<ShiftRow>

  listForSchedule(
    scheduleId: string,
    filter: ListShiftsFilter,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<ShiftRow>>

  bulkCreateFromPattern(
    rows: {
      scheduleId: string
      categoryId: string
      patternId: string
      startAt: Date
      endAt: Date
      headcount: number
    }[],
    tx?: DbClient,
  ): Promise<{ count: number }>

  /** Upcoming shifts in `[fromAt, toAt]` for a workspace, including category name. */
  listUpcomingForWorkspace(
    workspaceId: string,
    range: { fromAt: Date; toAt: Date; limit: number },
    tx?: DbClient,
  ): Promise<UpcomingShiftWithCategory[]>

  /** Aggregate shift count + total headcount for the dashboard "this week" KPIs. */
  aggregateForWeek(
    workspaceId: string,
    range: { fromAt: Date; toAt: Date },
    tx?: DbClient,
  ): Promise<{ count: number; totalHeadcount: number }>

  /** Per-category aggregate inside the date range — used by the Setores breakdown. */
  countByCategoryForWeek(
    workspaceId: string,
    range: { fromAt: Date; toAt: Date },
    tx?: DbClient,
  ): Promise<
    Array<{
      categoryId: string
      count: number
      totalHeadcount: number
    }>
  >

  /** Open-for-apply shifts a user can volunteer to, across their active workspaces. */
  listOpenForUser(
    userId: string,
    workspaceIds: string[],
    tx?: DbClient,
  ): Promise<OpenShiftForUserRow[]>
}

const SHIFT_SELECT = {
  id: true,
  scheduleId: true,
  categoryId: true,
  patternId: true,
  startAt: true,
  endAt: true,
  headcount: true,
  status: true,
  assignmentMode: true,
  decisionWindowHours: true,
  notes: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createShiftRepository(prisma: PrismaClient): ShiftRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.shift.create({
        data: {
          scheduleId: data.scheduleId,
          categoryId: data.categoryId,
          ...(data.patternId !== undefined && { patternId: data.patternId }),
          startAt: data.startAt,
          endAt: data.endAt,
          headcount: data.headcount,
          ...(data.notes !== undefined && { notes: data.notes }),
        },
        select: SHIFT_SELECT,
      }) as Promise<ShiftRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.shift.findUnique({
        where: { id },
        select: SHIFT_SELECT,
      }) as Promise<ShiftRow | null>
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.shift.update({
        where: { id },
        data,
        select: SHIFT_SELECT,
      }) as Promise<ShiftRow>
    },

    async hardDelete(id, tx) {
      const db = tx ?? prisma
      await db.shift.delete({ where: { id } })
    },

    async setStatus(id, status, extras, tx) {
      const db = tx ?? prisma
      return db.shift.update({
        where: { id },
        data: {
          status,
          ...(extras.cancelledAt !== undefined && {
            cancelledAt: extras.cancelledAt,
          }),
          ...(extras.cancelReason !== undefined && {
            cancelReason: extras.cancelReason,
          }),
        },
        select: SHIFT_SELECT,
      }) as Promise<ShiftRow>
    },

    async listForSchedule(scheduleId, filter, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor, isStartAtCursor)
      const items = await db.shift.findMany({
        where: {
          scheduleId,
          ...(filter.status && { status: filter.status }),
          ...(filter.categoryId && { categoryId: filter.categoryId }),
          ...(filter.fromAt && { startAt: { gte: filter.fromAt } }),
          ...(filter.toAt && { startAt: { lte: filter.toAt } }),
          ...(decoded && {
            OR: [
              { startAt: { gt: new Date(decoded.startAt) } },
              {
                startAt: new Date(decoded.startAt),
                id: { gt: decoded.id },
              },
            ],
          }),
        },
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        select: SHIFT_SELECT,
      })

      const hasMore = items.length > limit
      const data = hasMore ? items.slice(0, limit) : items
      const last = data[data.length - 1]
      const nextCursor: string | null =
        hasMore && last
          ? encodeCursor({
              startAt: last.startAt.toISOString(),
              id: last.id,
            })
          : null

      return { data: data as ShiftRow[], nextCursor }
    },

    async bulkCreateFromPattern(rows, tx) {
      const db = tx ?? prisma
      const result = await db.shift.createMany({
        data: rows.map((r) => ({
          scheduleId: r.scheduleId,
          categoryId: r.categoryId,
          patternId: r.patternId,
          startAt: r.startAt,
          endAt: r.endAt,
          headcount: r.headcount,
        })),
        skipDuplicates: true,
      })
      return { count: result.count }
    },

    async listUpcomingForWorkspace(workspaceId, { fromAt, toAt, limit }, tx) {
      const db = tx ?? prisma
      const items = await db.shift.findMany({
        where: {
          schedule: { workspaceId, status: { not: 'CLOSED' } },
          cancelledAt: null,
          startAt: { gte: fromAt, lte: toAt },
        },
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        take: limit,
      })
      return items.map((s) => ({
        id: s.id,
        scheduleId: s.scheduleId,
        categoryId: s.categoryId,
        patternId: s.patternId,
        startAt: s.startAt,
        endAt: s.endAt,
        headcount: s.headcount,
        status: s.status as ShiftStatus,
        assignmentMode: s.assignmentMode as ShiftAssignmentMode,
        decisionWindowHours: s.decisionWindowHours,
        notes: s.notes,
        cancelledAt: s.cancelledAt,
        cancelReason: s.cancelReason,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        categoryName: s.category.name,
      }))
    },

    async aggregateForWeek(workspaceId, { fromAt, toAt }, tx) {
      const db = tx ?? prisma
      const result = await db.shift.aggregate({
        where: {
          schedule: { workspaceId, status: { not: 'CLOSED' } },
          cancelledAt: null,
          startAt: { gte: fromAt, lte: toAt },
        },
        _count: { _all: true },
        _sum: { headcount: true },
      })
      return {
        count: result._count._all,
        totalHeadcount: result._sum.headcount ?? 0,
      }
    },

    async countByCategoryForWeek(workspaceId, { fromAt, toAt }, tx) {
      const db = tx ?? prisma
      const grouped = await db.shift.groupBy({
        by: ['categoryId'],
        where: {
          schedule: { workspaceId, status: { not: 'CLOSED' } },
          cancelledAt: null,
          startAt: { gte: fromAt, lte: toAt },
        },
        _count: { _all: true },
        _sum: { headcount: true },
      })
      return grouped.map((g) => ({
        categoryId: g.categoryId,
        count: g._count._all,
        totalHeadcount: g._sum.headcount ?? 0,
      }))
    },

    async listOpenForUser(userId, workspaceIds, tx) {
      const db = tx ?? prisma
      if (workspaceIds.length === 0) return []
      const rows = await db.shift.findMany({
        where: {
          schedule: {
            workspaceId: { in: workspaceIds },
            status: 'PUBLISHED',
          },
          status: 'OPEN',
          assignmentMode: 'OPEN_FOR_APPLY',
          cancelledAt: null,
        },
        select: {
          id: true,
          scheduleId: true,
          categoryId: true,
          startAt: true,
          endAt: true,
          headcount: true,
          category: { select: { name: true } },
          _count: {
            select: {
              assignments: {
                where: {
                  status: {
                    in: [
                      'PENDING_ACCEPT',
                      'ACCEPTED',
                      'PENDING_CLOSURE',
                      'COMPLETED',
                    ],
                  },
                },
              },
            },
          },
          candidates: {
            where: { userId },
            select: {
              id: true,
              queuePosition: true,
              status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { startAt: 'asc' },
        take: 100,
      })
      return rows.map((r) => ({
        id: r.id,
        scheduleId: r.scheduleId,
        categoryId: r.categoryId,
        categoryName: r.category.name,
        startAt: r.startAt,
        endAt: r.endAt,
        headcount: r.headcount,
        activeAssignmentsCount: r._count.assignments,
        myCandidacy: r.candidates[0] ?? null,
      }))
    },
  }
}
