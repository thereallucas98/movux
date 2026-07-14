import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export type SpecialtyScope = 'GLOBAL' | 'TENANT' | 'WORKSPACE'
export type SpecialtyVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

export interface SpecialtyRow {
  id: string
  scope: SpecialtyScope
  vertical: SpecialtyVertical | null
  tenantId: string | null
  workspaceId: string | null
  slug: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SpecialtyRepository {
  create(
    data: {
      scope: SpecialtyScope
      vertical?: SpecialtyVertical | null
      tenantId?: string | null
      workspaceId?: string | null
      slug: string
      name: string
      description?: string | null
    },
    tx?: DbClient,
  ): Promise<SpecialtyRow>

  findById(id: string, tx?: DbClient): Promise<SpecialtyRow | null>

  findWorkspaceScoped(
    input: { workspaceId: string; slug: string },
    tx?: DbClient,
  ): Promise<SpecialtyRow | null>

  update(
    id: string,
    data: { name?: string; description?: string | null },
    tx?: DbClient,
  ): Promise<SpecialtyRow>

  softDelete(id: string, tx?: DbClient): Promise<void>

  listGlobal(
    vertical: SpecialtyVertical,
    tx?: DbClient,
  ): Promise<SpecialtyRow[]>

  listTenant(tenantId: string, tx?: DbClient): Promise<SpecialtyRow[]>

  listWorkspace(workspaceId: string, tx?: DbClient): Promise<SpecialtyRow[]>

  findAvailableForWorkspace(
    workspaceId: string,
    specialtyId: string,
    tx?: DbClient,
  ): Promise<SpecialtyRow | null>
}

const SPECIALTY_SELECT = {
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

export function createSpecialtyRepository(
  prisma: PrismaClient,
): SpecialtyRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.specialty.create({
        data: {
          scope: data.scope,
          vertical: data.vertical ?? null,
          tenantId: data.tenantId ?? null,
          workspaceId: data.workspaceId ?? null,
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
        },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.specialty.findFirst({
        where: { id, isActive: true },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow | null>
    },

    async findWorkspaceScoped(input, tx) {
      const db = tx ?? prisma
      return db.specialty.findFirst({
        where: {
          scope: 'WORKSPACE',
          workspaceId: input.workspaceId,
          slug: input.slug,
          isActive: true,
        },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow | null>
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.specialty.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
        },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow>
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.specialty.update({
        where: { id },
        data: { isActive: false },
      })
    },

    async listGlobal(vertical, tx) {
      const db = tx ?? prisma
      return db.specialty.findMany({
        where: { scope: 'GLOBAL', vertical, isActive: true },
        orderBy: { name: 'asc' },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow[]>
    },

    async listTenant(tenantId, tx) {
      const db = tx ?? prisma
      return db.specialty.findMany({
        where: { scope: 'TENANT', tenantId, isActive: true },
        orderBy: { name: 'asc' },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow[]>
    },

    async listWorkspace(workspaceId, tx) {
      const db = tx ?? prisma
      return db.specialty.findMany({
        where: { scope: 'WORKSPACE', workspaceId, isActive: true },
        orderBy: { name: 'asc' },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow[]>
    },

    async findAvailableForWorkspace(workspaceId, specialtyId, tx) {
      const db = tx ?? prisma
      const ws = await db.workspace.findFirst({
        where: { id: workspaceId, isActive: true },
        select: { tenantId: true, vertical: true },
      })
      if (!ws) return null

      return db.specialty.findFirst({
        where: {
          id: specialtyId,
          isActive: true,
          OR: [
            { scope: 'GLOBAL', vertical: ws.vertical },
            { scope: 'TENANT', tenantId: ws.tenantId },
            { scope: 'WORKSPACE', workspaceId },
          ],
        },
        select: SPECIALTY_SELECT,
      }) as Promise<SpecialtyRow | null>
    },
  }
}
