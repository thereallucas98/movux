import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import { decodeCursor, encodeCursor } from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'

export interface ScheduleRow {
  id: string
  workspaceId: string
  categoryId: string
  name: string | null
  periodStart: Date
  periodEnd: Date
  status: ScheduleStatus
  publishedAt: Date | null
  closedAt: Date | null
  deletedAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ListSchedulesFilter {
  status?: ScheduleStatus
  categoryId?: string
  from?: Date
  to?: Date
}

export interface ScheduleRepository {
  create(
    data: {
      workspaceId: string
      categoryId: string
      name?: string | null
      periodStart: Date
      periodEnd: Date
    },
    tx?: DbClient,
  ): Promise<ScheduleRow>

  findById(id: string, tx?: DbClient): Promise<ScheduleRow | null>

  update(
    id: string,
    data: Partial<{
      name: string | null
      categoryId: string
      periodStart: Date
      periodEnd: Date
      status: ScheduleStatus
      publishedAt: Date | null
      closedAt: Date | null
    }>,
    tx?: DbClient,
  ): Promise<ScheduleRow>

  hardDelete(id: string, tx?: DbClient): Promise<void>

  softDelete(id: string, tx?: DbClient): Promise<void>

  listForWorkspace(
    workspaceId: string,
    filter: ListSchedulesFilter,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<ScheduleRow>>

  findOverlapping(
    input: {
      workspaceId: string
      categoryId: string
      periodStart: Date
      periodEnd: Date
      excludeId?: string
    },
    tx?: DbClient,
  ): Promise<ScheduleRow | null>
}

const SCHEDULE_SELECT = {
  id: true,
  workspaceId: true,
  categoryId: true,
  name: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  publishedAt: true,
  closedAt: true,
  deletedAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createScheduleRepository(
  prisma: PrismaClient,
): ScheduleRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.schedule.create({
        data: {
          workspaceId: data.workspaceId,
          categoryId: data.categoryId,
          ...(data.name !== undefined && { name: data.name }),
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
        },
        select: SCHEDULE_SELECT,
      }) as Promise<ScheduleRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.schedule.findFirst({
        where: { id, isActive: true },
        select: SCHEDULE_SELECT,
      }) as Promise<ScheduleRow | null>
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.schedule.update({
        where: { id },
        data,
        select: SCHEDULE_SELECT,
      }) as Promise<ScheduleRow>
    },

    async hardDelete(id, tx) {
      const db = tx ?? prisma
      await db.schedule.delete({ where: { id } })
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.schedule.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      })
    },

    async listForWorkspace(workspaceId, filter, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor)
      const items = await db.schedule.findMany({
        where: {
          workspaceId,
          isActive: true,
          ...(filter.status && { status: filter.status }),
          ...(filter.categoryId && { categoryId: filter.categoryId }),
          ...(filter.from && { periodEnd: { gte: filter.from } }),
          ...(filter.to && { periodStart: { lte: filter.to } }),
          ...(decoded && {
            OR: [
              { periodStart: { lt: new Date(decoded.createdAt) } },
              {
                periodStart: new Date(decoded.createdAt),
                id: { lt: decoded.id },
              },
            ],
          }),
        },
        orderBy: [{ periodStart: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: SCHEDULE_SELECT,
      })

      const hasMore = items.length > limit
      const data = hasMore ? items.slice(0, limit) : items
      const last = data[data.length - 1]
      const nextCursor: string | null =
        hasMore && last
          ? encodeCursor({
              createdAt: last.periodStart.toISOString(),
              id: last.id,
            })
          : null

      return { data: data as ScheduleRow[], nextCursor }
    },

    async findOverlapping(input, tx) {
      const db = tx ?? prisma
      return db.schedule.findFirst({
        where: {
          workspaceId: input.workspaceId,
          categoryId: input.categoryId,
          isActive: true,
          status: { in: ['DRAFT', 'PUBLISHED'] },
          ...(input.excludeId && { id: { not: input.excludeId } }),
          periodStart: { lt: input.periodEnd },
          periodEnd: { gt: input.periodStart },
        },
        select: SCHEDULE_SELECT,
      }) as Promise<ScheduleRow | null>
    },
  }
}
