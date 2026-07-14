import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import { decodeCursor, encodeCursor } from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

const WORKSPACE_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  timezone: true,
  vertical: true,
  clockToleranceMinutes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export type WorkspaceVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

export interface WorkspaceRow {
  id: string
  tenantId: string
  name: string
  timezone: string
  vertical: WorkspaceVertical
  clockToleranceMinutes: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MembershipSpecialtySummary {
  id: string
  slug: string
  name: string
  scope: 'GLOBAL' | 'TENANT' | 'WORKSPACE'
  vertical: string | null
  isActive: boolean
}

export interface WorkspaceWithMembers extends WorkspaceRow {
  memberships: Array<{
    id: string
    role: string
    isActive: boolean
    user: {
      id: string
      email: string
      fullName: string
    }
    specialty: MembershipSpecialtySummary | null
  }>
  nextMembershipCursor: string | null
}

export interface WorkspaceRepository {
  create(
    data: {
      tenantId: string
      name: string
      timezone?: string
      vertical: string
    },
    tx?: DbClient,
  ): Promise<WorkspaceRow>

  findById(id: string, tx?: DbClient): Promise<WorkspaceRow | null>

  findByIdWithMembersPage(
    id: string,
    membersCursor: string | null | undefined,
    membersLimit: number,
    tx?: DbClient,
  ): Promise<WorkspaceWithMembers | null>

  update(
    id: string,
    data: { name?: string; timezone?: string; vertical?: string },
    tx?: DbClient,
  ): Promise<WorkspaceRow>

  softDelete(id: string, tx?: DbClient): Promise<void>

  listForUser(
    userId: string,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<WorkspaceRow>>

  listForTenant(
    tenantId: string,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<WorkspaceRow>>
}

export function createWorkspaceRepository(
  prisma: PrismaClient,
): WorkspaceRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.workspace.create({
        data: {
          tenantId: data.tenantId,
          name: data.name,
          vertical: data.vertical as 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER',
          ...(data.timezone ? { timezone: data.timezone } : {}),
        },
        select: WORKSPACE_SELECT,
      })
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.workspace.findFirst({
        where: { id, isActive: true },
        select: WORKSPACE_SELECT,
      })
    },

    async findByIdWithMembersPage(id, membersCursor, membersLimit, tx) {
      const db = tx ?? prisma
      const workspace = await db.workspace.findFirst({
        where: { id, isActive: true },
        select: WORKSPACE_SELECT,
      })
      if (!workspace) return null

      const decoded = decodeCursor(membersCursor)
      const memberships = await db.workspaceMembership.findMany({
        where: {
          workspaceId: id,
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
        ...workspace,
        memberships: page.map((m) => ({
          id: m.id,
          role: m.role,
          isActive: m.isActive,
          user: m.user,
          specialty: null,
        })),
        nextMembershipCursor,
      }
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.workspace.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.timezone !== undefined && { timezone: data.timezone }),
          ...(data.vertical !== undefined && {
            vertical: data.vertical as 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER',
          }),
        },
        select: WORKSPACE_SELECT,
      })
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.workspace.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      })
    },

    async listForUser(userId, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor)
      const items = await db.workspace.findMany({
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
        select: WORKSPACE_SELECT,
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

    async listForTenant(tenantId, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor)
      const items = await db.workspace.findMany({
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
        select: WORKSPACE_SELECT,
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
