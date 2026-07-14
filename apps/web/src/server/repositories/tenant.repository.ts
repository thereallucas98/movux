import type { PlanTier, Prisma, PrismaClient } from '~/generated/prisma/client'
import { decodeCursor, encodeCursor } from '~/server/lib/cursor'

/** Accepts either the singleton PrismaClient or a $transaction callback client. */
type DbClient = PrismaClient | Prisma.TransactionClient

const TENANT_SELECT = {
  id: true,
  name: true,
  timezone: true,
  plan: true,
  gracePeriodUntil: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export interface TenantRow {
  id: string
  name: string
  timezone: string
  plan: PlanTier
  gracePeriodUntil: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TenantWithMembers extends TenantRow {
  memberships: Array<{
    id: string
    role: string
    isActive: boolean
    user: {
      id: string
      email: string
      fullName: string
    }
  }>
  nextMembershipCursor: string | null
}

export interface ListPage<T> {
  data: T[]
  nextCursor: string | null
}

export interface TenantRepository {
  create(
    data: { name: string; timezone?: string },
    tx?: DbClient,
  ): Promise<TenantRow>

  findById(id: string, tx?: DbClient): Promise<TenantRow | null>

  findByIdWithMembersPage(
    id: string,
    membersCursor: string | null | undefined,
    membersLimit: number,
    tx?: DbClient,
  ): Promise<TenantWithMembers | null>

  update(
    id: string,
    data: { name?: string; timezone?: string },
    tx?: DbClient,
  ): Promise<TenantRow>

  updatePlan(
    id: string,
    plan: PlanTier,
    gracePeriodUntil: Date | null,
    tx?: DbClient,
  ): Promise<TenantRow>

  softDelete(id: string, tx?: DbClient): Promise<void>

  listForUser(
    userId: string,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<TenantRow>>
}

export function createTenantRepository(prisma: PrismaClient): TenantRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.tenant.create({
        data: {
          name: data.name,
          ...(data.timezone ? { timezone: data.timezone } : {}),
        },
        select: TENANT_SELECT,
      })
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.tenant.findFirst({
        where: { id, isActive: true },
        select: TENANT_SELECT,
      })
    },

    async findByIdWithMembersPage(id, membersCursor, membersLimit, tx) {
      const db = tx ?? prisma
      const tenant = await db.tenant.findFirst({
        where: { id, isActive: true },
        select: TENANT_SELECT,
      })
      if (!tenant) return null

      const decoded = decodeCursor(membersCursor)
      const memberships = await db.tenantMembership.findMany({
        where: {
          tenantId: id,
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
        take: membersLimit + 1,
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

      const hasMore = memberships.length > membersLimit
      const page = hasMore ? memberships.slice(0, membersLimit) : memberships
      const last = page[page.length - 1]
      const nextMembershipCursor: string | null =
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null

      return {
        ...tenant,
        memberships: page.map((m) => ({
          id: m.id,
          role: m.role,
          isActive: m.isActive,
          user: m.user,
        })),
        nextMembershipCursor,
      }
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.tenant.update({
        where: { id },
        data,
        select: TENANT_SELECT,
      })
    },

    async updatePlan(id, plan, gracePeriodUntil, tx) {
      const db = tx ?? prisma
      return db.tenant.update({
        where: { id },
        data: { plan, gracePeriodUntil },
        select: TENANT_SELECT,
      })
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.tenant.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      })
    },

    async listForUser(userId, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor)
      const items = await db.tenant.findMany({
        where: {
          isActive: true,
          memberships: {
            some: {
              userId,
              isActive: true,
            },
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
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: TENANT_SELECT,
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
  }
}
