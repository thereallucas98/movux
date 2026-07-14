import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export type CategoryScope = 'GLOBAL' | 'TENANT' | 'WORKSPACE'
export type CategoryVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

export interface CategoryRow {
  id: string
  scope: CategoryScope
  vertical: CategoryVertical | null
  tenantId: string | null
  workspaceId: string | null
  slug: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CategoryRepository {
  create(
    data: {
      scope: CategoryScope
      vertical?: CategoryVertical | null
      tenantId?: string | null
      workspaceId?: string | null
      slug: string
      name: string
      description?: string | null
    },
    tx?: DbClient,
  ): Promise<CategoryRow>

  findById(id: string, tx?: DbClient): Promise<CategoryRow | null>

  findWorkspaceScoped(
    input: { workspaceId: string; slug: string },
    tx?: DbClient,
  ): Promise<CategoryRow | null>

  update(
    id: string,
    data: { name?: string; description?: string | null },
    tx?: DbClient,
  ): Promise<CategoryRow>

  softDelete(id: string, tx?: DbClient): Promise<void>

  listGlobal(vertical: CategoryVertical, tx?: DbClient): Promise<CategoryRow[]>

  listTenant(tenantId: string, tx?: DbClient): Promise<CategoryRow[]>

  listWorkspace(workspaceId: string, tx?: DbClient): Promise<CategoryRow[]>

  findAvailableForWorkspace(
    workspaceId: string,
    categoryId: string,
    tx?: DbClient,
  ): Promise<CategoryRow | null>
}

const CATEGORY_SELECT = {
  id: true,
  scope: true,
  vertical: true,
  tenantId: true,
  workspaceId: true,
  slug: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createCategoryRepository(
  prisma: PrismaClient,
): CategoryRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.category.create({
        data: {
          scope: data.scope,
          vertical: data.vertical ?? null,
          tenantId: data.tenantId ?? null,
          workspaceId: data.workspaceId ?? null,
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
        },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.category.findFirst({
        where: { id, isActive: true },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow | null>
    },

    async findWorkspaceScoped(input, tx) {
      const db = tx ?? prisma
      return db.category.findFirst({
        where: {
          scope: 'WORKSPACE',
          workspaceId: input.workspaceId,
          slug: input.slug,
          isActive: true,
        },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow | null>
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.category.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
        },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow>
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.category.update({
        where: { id },
        data: { isActive: false },
      })
    },

    async listGlobal(vertical, tx) {
      const db = tx ?? prisma
      return db.category.findMany({
        where: { scope: 'GLOBAL', vertical, isActive: true },
        orderBy: { name: 'asc' },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow[]>
    },

    async listTenant(tenantId, tx) {
      const db = tx ?? prisma
      return db.category.findMany({
        where: { scope: 'TENANT', tenantId, isActive: true },
        orderBy: { name: 'asc' },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow[]>
    },

    async listWorkspace(workspaceId, tx) {
      const db = tx ?? prisma
      return db.category.findMany({
        where: { scope: 'WORKSPACE', workspaceId, isActive: true },
        orderBy: { name: 'asc' },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow[]>
    },

    async findAvailableForWorkspace(workspaceId, categoryId, tx) {
      const db = tx ?? prisma
      const ws = await db.workspace.findFirst({
        where: { id: workspaceId, isActive: true },
        select: { tenantId: true, vertical: true },
      })
      if (!ws) return null

      return db.category.findFirst({
        where: {
          id: categoryId,
          isActive: true,
          OR: [
            { scope: 'GLOBAL', vertical: ws.vertical },
            { scope: 'TENANT', tenantId: ws.tenantId },
            { scope: 'WORKSPACE', workspaceId },
          ],
        },
        select: CATEGORY_SELECT,
      }) as Promise<CategoryRow | null>
    },
  }
}
