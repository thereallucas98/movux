import type { PrismaClient, Role } from '~/generated/prisma/client'

export interface UserRepository {
  findByEmail(email: string): Promise<{ id: string } | null>
  findByEmailForLogin(email: string): Promise<{
    id: string
    email: string
    fullName: string
    role: Role
    passwordHash: string
    deletedAt: Date | null
  } | null>
  findById(id: string): Promise<{
    id: string
    email: string
    fullName: string
    role: Role
    avatarUrl: string | null
    createdAt: Date
  } | null>
  createCustomer(data: {
    fullName: string
    email: string
    passwordHash: string
    phone?: string
  }): Promise<{ id: string; email: string; fullName: string; role: Role }>
  createCarrier(data: {
    fullName: string
    email: string
    passwordHash: string
    phone: string
  }): Promise<{ id: string; email: string; fullName: string; role: Role }>
  markEmailVerified(id: string): Promise<void>
}

const CREATED_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
} as const

export function createUserRepository(prisma: PrismaClient): UserRepository {
  return {
    async findByEmail(email) {
      return prisma.user.findUnique({ where: { email }, select: { id: true } })
    },

    async findByEmailForLogin(email) {
      return prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          passwordHash: true,
          deletedAt: true,
        },
      })
    },

    async findById(id) {
      return prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      })
    },

    async createCustomer(data) {
      return prisma.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash: data.passwordHash,
          role: 'CUSTOMER',
          customerProfile: { create: { phone: data.phone } },
        },
        select: CREATED_USER_SELECT,
      })
    },

    async createCarrier(data) {
      return prisma.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash: data.passwordHash,
          role: 'CARRIER',
          carrierProfile: { create: { phone: data.phone } },
        },
        select: CREATED_USER_SELECT,
      })
    },

    async markEmailVerified(id) {
      await prisma.user.update({
        where: { id },
        data: { emailVerifiedAt: new Date() },
      })
    },
  }
}
