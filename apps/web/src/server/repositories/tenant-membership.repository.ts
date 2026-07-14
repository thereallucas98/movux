import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import { decodeCursor, encodeCursor } from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface MembershipRow {
  id: string
  tenantId: string
  userId: string
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MembershipWithUser {
  id: string
  role: string
  isActive: boolean
  createdAt: Date
  user: {
    id: string
    email: string
    fullName: string
  }
}

export interface TenantMembershipRepository {
  create(
    data: { tenantId: string; userId: string; role: 'SUPER_ADMIN' },
    tx?: DbClient,
  ): Promise<MembershipRow>

  findActive(
    input: { tenantId: string; userId: string },
    tx?: DbClient,
  ): Promise<MembershipRow | null>

  findById(id: string, tx?: DbClient): Promise<MembershipRow | null>

  softDelete(id: string, tx?: DbClient): Promise<void>

  softDeleteAllByTenant(tenantId: string, tx?: DbClient): Promise<void>

  listActiveByTenant(
    tenantId: string,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<MembershipWithUser>>

  listActiveByUser(userId: string, tx?: DbClient): Promise<MembershipRow[]>

  countActiveSuperAdmins(tenantId: string, tx?: DbClient): Promise<number>
}

const MEMBERSHIP_SELECT = {
  id: true,
  tenantId: true,
  userId: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createTenantMembershipRepository(
  prisma: PrismaClient,
): TenantMembershipRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.tenantMembership.create({
        data,
        select: MEMBERSHIP_SELECT,
      })
    },

    async findActive(input, tx) {
      const db = tx ?? prisma
      return db.tenantMembership.findFirst({
        where: {
          tenantId: input.tenantId,
          userId: input.userId,
          isActive: true,
        },
        select: MEMBERSHIP_SELECT,
      })
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.tenantMembership.findUnique({
        where: { id },
        select: MEMBERSHIP_SELECT,
      })
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.tenantMembership.update({
        where: { id },
        data: { isActive: false },
      })
    },

    async softDeleteAllByTenant(tenantId, tx) {
      const db = tx ?? prisma
      await db.tenantMembership.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false },
      })
    },

    async listActiveByTenant(tenantId, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor)
      const items = await db.tenantMembership.findMany({
        where: {
          tenantId,
          isActive: true,
          ...(decoded && {
            OR: [
              { createdAt: { lt: new Date(decoded.createdAt) } },
              {
                createdAt: new Date(decoded.createdAt),
                id: { lt: decoded.id },
              },
            ],
          }),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          role: true,
          isActive: true,
          createdAt: true,
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
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

      return { data, nextCursor }
    },

    async listActiveByUser(userId, tx) {
      const db = tx ?? prisma
      return db.tenantMembership.findMany({
        where: { userId, isActive: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: MEMBERSHIP_SELECT,
      })
    },

    async countActiveSuperAdmins(tenantId, tx) {
      const db = tx ?? prisma
      return db.tenantMembership.count({
        where: {
          tenantId,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      })
    },
  }
}
