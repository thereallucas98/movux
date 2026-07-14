import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import {
  decodeCursor,
  encodeCursor,
  isCreatedAtCursor,
} from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface AuditLogInput {
  actorUserId: string | null
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
}

export interface AuditLogRow {
  id: string
  actorUserId: string | null
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface ListAuditLogForShiftInput {
  shiftId: string
  cursor?: string | null
  limit: number
  order: 'asc' | 'desc'
  since?: Date
}

export interface AuditLogRepository {
  log(input: AuditLogInput, tx?: DbClient): Promise<void>
  listForShift(
    input: ListAuditLogForShiftInput,
    tx?: DbClient,
  ): Promise<ListPage<AuditLogRow>>
}

export function createAuditLogRepository(
  prisma: PrismaClient,
): AuditLogRepository {
  return {
    async log(input, tx) {
      const db = tx ?? prisma
      await db.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          ...(input.metadata !== undefined && {
            metadata: input.metadata as Prisma.InputJsonValue,
          }),
        },
      })
    },

    async listForShift(input, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(input.cursor, isCreatedAtCursor)

      // Match shift events via 4 paths (Task 14 research §3.1):
      //   1. SHIFT-typed audits where entityId === shiftId
      //   2. metadata.shiftId === shiftId       (assignment, candidate, time entry)
      //   3. metadata.sourceShiftId === shiftId (SWAP request — source side)
      //   4. metadata.targetShiftId === shiftId (SWAP request — target side)
      const shiftMatchOr: Prisma.AuditLogWhereInput[] = [
        { entityType: 'SHIFT', entityId: input.shiftId },
        { metadata: { path: ['shiftId'], equals: input.shiftId } },
        { metadata: { path: ['sourceShiftId'], equals: input.shiftId } },
        { metadata: { path: ['targetShiftId'], equals: input.shiftId } },
      ]

      const cursorClause: Prisma.AuditLogWhereInput | null = decoded
        ? input.order === 'asc'
          ? {
              OR: [
                { createdAt: { gt: new Date(decoded.createdAt) } },
                {
                  createdAt: new Date(decoded.createdAt),
                  id: { gt: decoded.id },
                },
              ],
            }
          : {
              OR: [
                { createdAt: { lt: new Date(decoded.createdAt) } },
                {
                  createdAt: new Date(decoded.createdAt),
                  id: { lt: decoded.id },
                },
              ],
            }
        : null

      const where: Prisma.AuditLogWhereInput = {
        AND: [
          { OR: shiftMatchOr },
          ...(input.since ? [{ createdAt: { gte: input.since } }] : []),
          ...(cursorClause ? [cursorClause] : []),
        ],
      }

      const items = await db.auditLog.findMany({
        where,
        orderBy: [{ createdAt: input.order }, { id: input.order }],
        take: input.limit + 1,
        select: {
          id: true,
          actorUserId: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      })

      const hasMore = items.length > input.limit
      const data = hasMore ? items.slice(0, input.limit) : items
      const last = data[data.length - 1]
      const nextCursor: string | null =
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null

      return {
        data: data.map((row) => ({
          id: row.id,
          actorUserId: row.actorUserId,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          metadata: (row.metadata as Record<string, unknown> | null) ?? null,
          createdAt: row.createdAt,
        })),
        nextCursor,
      }
    },
  }
}
