import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface UserSpecialtyRow {
  id: string
  userId: string
  workspaceId: string
  specialtyId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type SpecialtyScope = 'GLOBAL' | 'TENANT' | 'WORKSPACE'
type SpecialtyVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

export interface UserSpecialtyWithSpecialty extends UserSpecialtyRow {
  specialty: {
    id: string
    scope: SpecialtyScope
    vertical: SpecialtyVertical | null
    slug: string
    name: string
    description: string | null
  }
}

export interface UserSpecialtyRepository {
  create(
    data: { userId: string; workspaceId: string; specialtyId: string },
    tx?: DbClient,
  ): Promise<UserSpecialtyRow>

  findActiveByMember(
    input: { userId: string; workspaceId: string },
    tx?: DbClient,
  ): Promise<UserSpecialtyRow | null>

  findActiveByMemberWithSpecialty(
    input: { userId: string; workspaceId: string },
    tx?: DbClient,
  ): Promise<UserSpecialtyWithSpecialty | null>

  softDelete(id: string, tx?: DbClient): Promise<void>

  countActiveBySpecialty(specialtyId: string, tx?: DbClient): Promise<number>

  listByUser(
    userId: string,
    tx?: DbClient,
  ): Promise<UserSpecialtyWithSpecialty[]>

  listActiveByWorkspaceForUsers(
    workspaceId: string,
    userIds: string[],
    tx?: DbClient,
  ): Promise<UserSpecialtyWithSpecialty[]>
}

const USER_SPECIALTY_SELECT = {
  id: true,
  userId: true,
  workspaceId: true,
  specialtyId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const SPECIALTY_NESTED_SELECT = {
  id: true,
  scope: true,
  vertical: true,
  slug: true,
  name: true,
  description: true,
} as const

export function createUserSpecialtyRepository(
  prisma: PrismaClient,
): UserSpecialtyRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.userSpecialty.create({
        data,
        select: USER_SPECIALTY_SELECT,
      }) as Promise<UserSpecialtyRow>
    },

    async findActiveByMember(input, tx) {
      const db = tx ?? prisma
      return db.userSpecialty.findFirst({
        where: {
          userId: input.userId,
          workspaceId: input.workspaceId,
          isActive: true,
        },
        select: USER_SPECIALTY_SELECT,
      }) as Promise<UserSpecialtyRow | null>
    },

    async findActiveByMemberWithSpecialty(input, tx) {
      const db = tx ?? prisma
      return db.userSpecialty.findFirst({
        where: {
          userId: input.userId,
          workspaceId: input.workspaceId,
          isActive: true,
        },
        select: {
          ...USER_SPECIALTY_SELECT,
          specialty: { select: SPECIALTY_NESTED_SELECT },
        },
      }) as Promise<UserSpecialtyWithSpecialty | null>
    },

    async softDelete(id, tx) {
      const db = tx ?? prisma
      await db.userSpecialty.update({
        where: { id },
        data: { isActive: false },
      })
    },

    async countActiveBySpecialty(specialtyId, tx) {
      const db = tx ?? prisma
      return db.userSpecialty.count({
        where: { specialtyId, isActive: true },
      })
    },

    async listByUser(userId, tx) {
      const db = tx ?? prisma
      return db.userSpecialty.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          ...USER_SPECIALTY_SELECT,
          specialty: { select: SPECIALTY_NESTED_SELECT },
        },
      }) as Promise<UserSpecialtyWithSpecialty[]>
    },

    async listActiveByWorkspaceForUsers(workspaceId, userIds, tx) {
      const db = tx ?? prisma
      if (userIds.length === 0) return []
      return db.userSpecialty.findMany({
        where: {
          workspaceId,
          userId: { in: userIds },
          isActive: true,
        },
        select: {
          ...USER_SPECIALTY_SELECT,
          specialty: { select: SPECIALTY_NESTED_SELECT },
        },
      }) as Promise<UserSpecialtyWithSpecialty[]>
    },
  }
}
