import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import { decodeCursor, encodeCursor } from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export type WorkspaceRole = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'

export interface MembershipRow {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MembershipWithUser {
  id: string
  role: WorkspaceRole
  isActive: boolean
  createdAt: Date
  user: {
    id: string
    email: string
    fullName: string
  }
}

export interface WorkspaceMembershipRepository {
  create(
    data: { workspaceId: string; userId: string; role: WorkspaceRole },
    tx?: DbClient,
  ): Promise<MembershipRow>

  findActive(
    input: { workspaceId: string; userId: string },
    tx?: DbClient,
  ): Promise<MembershipRow | null>

  findAny(
    input: { workspaceId: string; userId: string },
    tx?: DbClient,
  ): Promise<MembershipRow | null>

  findById(id: string, tx?: DbClient): Promise<MembershipRow | null>

  updateRole(
    id: string,
    role: WorkspaceRole,
    tx?: DbClient,
  ): Promise<MembershipRow>

  reactivate(
    id: string,
    role: WorkspaceRole,
    tx?: DbClient,
  ): Promise<MembershipRow>

  softDelete(id: string, tx?: DbClient): Promise<void>

  softDeleteAllByWorkspace(workspaceId: string, tx?: DbClient): Promise<void>

  listActiveByWorkspace(
    workspaceId: string,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<MembershipWithUser>>

  listActiveByUser(userId: string, tx?: DbClient): Promise<MembershipRow[]>

  listActiveByRole(
    workspaceId: string,
    roles: WorkspaceRole[],
    tx?: DbClient,
  ): Promise<Array<{ userId: string; role: WorkspaceRole }>>

  countActiveAdmins(workspaceId: string, tx?: DbClient): Promise<number>

  /** Total active members in a workspace (any role). */
  countActive(workspaceId: string, tx?: DbClient): Promise<number>
}

const MEMBERSHIP_SELECT = {
  id: true,
  workspaceId: true,
  userId: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createWorkspaceMembershipRepository(
  prisma: PrismaClient,
): WorkspaceMembershipRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.create({
        data,
        select: MEMBERSHIP_SELECT,
      })
    },

    async findActive(input, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          isActive: true,
        },
        select: MEMBERSHIP_SELECT,
      })
    },

    async findAny(input, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
        select: MEMBERSHIP_SELECT,
      })
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.findUnique({
        where: { id },
        select: MEMBERSHIP_SELECT,
      })
    },

    async updateRole(id, role, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.update({
        where: { id },
        data: { role },
        select: MEMBERSHIP_SELECT,
      })
    },

    async reactivate(id, role, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.update({
        where: { id },
        data: { isActive: true, role },
        select: MEMBERSHIP_SELECT,
      })
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.workspaceMembership.update({
        where: { id },
        data: { isActive: false },
      })
    },

    async softDeleteAllByWorkspace(workspaceId, tx) {
      const db = tx ?? prisma
      await db.workspaceMembership.updateMany({
        where: { workspaceId, isActive: true },
        data: { isActive: false },
      })
    },

    async listActiveByWorkspace(workspaceId, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor)
      const items = await db.workspaceMembership.findMany({
        where: {
          workspaceId,
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
      return db.workspaceMembership.findMany({
        where: { userId, isActive: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: MEMBERSHIP_SELECT,
      })
    },

    async listActiveByRole(workspaceId, roles, tx) {
      const db = tx ?? prisma
      if (roles.length === 0) return []
      const rows = await db.workspaceMembership.findMany({
        where: { workspaceId, role: { in: roles }, isActive: true },
        select: { userId: true, role: true },
      })
      return rows
    },

    async countActiveAdmins(workspaceId, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.count({
        where: {
          workspaceId,
          role: 'ADMIN',
          isActive: true,
        },
      })
    },

    async countActive(workspaceId, tx) {
      const db = tx ?? prisma
      return db.workspaceMembership.count({
        where: { workspaceId, isActive: true },
      })
    },
  }
}
