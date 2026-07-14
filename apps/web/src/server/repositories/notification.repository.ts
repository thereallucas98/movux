import type {
  NotificationType,
  Prisma,
  PrismaClient,
} from '~/generated/prisma/client'
import {
  decodeCursor,
  encodeCursor,
  isCreatedAtCursor,
} from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface NotificationRow {
  id: string
  userId: string
  workspaceId: string
  type: NotificationType
  payload: Record<string, unknown>
  readAt: Date | null
  createdAt: Date
}

export interface CreateNotificationInput {
  userId: string
  workspaceId: string
  type: NotificationType
  payload: Record<string, unknown>
}

export interface ListMyNotificationsInput {
  userId: string
  status: 'unread' | 'all'
  cursor?: string | null
  limit: number
}

export interface NotificationRepository {
  createMany(rows: CreateNotificationInput[], tx?: DbClient): Promise<number>
  listForUser(
    input: ListMyNotificationsInput,
    tx?: DbClient,
  ): Promise<ListPage<NotificationRow>>
  findByIdForUser(
    id: string,
    userId: string,
    tx?: DbClient,
  ): Promise<NotificationRow | null>
  markRead(id: string, tx?: DbClient): Promise<NotificationRow>
  markAllReadForUser(userId: string, tx?: DbClient): Promise<number>
  countUnreadForUser(userId: string, tx?: DbClient): Promise<number>
}

const NOTIFICATION_SELECT = {
  id: true,
  userId: true,
  workspaceId: true,
  type: true,
  payload: true,
  readAt: true,
  createdAt: true,
} as const

function toRow(row: {
  id: string
  userId: string
  workspaceId: string
  type: NotificationType
  payload: Prisma.JsonValue
  readAt: Date | null
  createdAt: Date
}): NotificationRow {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    type: row.type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    readAt: row.readAt,
    createdAt: row.createdAt,
  }
}

export function createNotificationRepository(
  prisma: PrismaClient,
): NotificationRepository {
  return {
    async createMany(rows, tx) {
      if (rows.length === 0) return 0
      const db = tx ?? prisma
      const result = await db.notification.createMany({
        data: rows.map((r) => ({
          userId: r.userId,
          workspaceId: r.workspaceId,
          type: r.type,
          payload: r.payload as Prisma.InputJsonValue,
        })),
      })
      return result.count
    },

    async listForUser(input, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(input.cursor, isCreatedAtCursor)
      const where: Prisma.NotificationWhereInput = {
        userId: input.userId,
        ...(input.status === 'unread' && { readAt: null }),
        ...(decoded && {
          OR: [
            { createdAt: { lt: new Date(decoded.createdAt) } },
            {
              AND: [
                { createdAt: new Date(decoded.createdAt) },
                { id: { lt: decoded.id } },
              ],
            },
          ],
        }),
      }
      const items = await db.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: input.limit + 1,
        select: NOTIFICATION_SELECT,
      })
      const hasMore = items.length > input.limit
      const data = (hasMore ? items.slice(0, input.limit) : items).map(toRow)
      const last = data[data.length - 1]
      const nextCursor: string | null =
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null
      return { data, nextCursor }
    },

    async findByIdForUser(id, userId, tx) {
      const db = tx ?? prisma
      const row = await db.notification.findFirst({
        where: { id, userId },
        select: NOTIFICATION_SELECT,
      })
      return row ? toRow(row) : null
    },

    async markRead(id, tx) {
      const db = tx ?? prisma
      const row = await db.notification.update({
        where: { id },
        data: { readAt: new Date() },
        select: NOTIFICATION_SELECT,
      })
      return toRow(row)
    },

    async markAllReadForUser(userId, tx) {
      const db = tx ?? prisma
      const result = await db.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      })
      return result.count
    },

    async countUnreadForUser(userId, tx) {
      const db = tx ?? prisma
      return db.notification.count({
        where: { userId, readAt: null },
      })
    },
  }
}
