import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface UserProfile {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  emailVerified: boolean
  phone: string | null
  avatarUrl: string | null
  dateOfBirth: Date | null
  bio: string | null
  whatsappOptIn: boolean
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserRepository {
  findEmailVerifiedById(id: string): Promise<{
    id: string
    email: string
    emailVerified: boolean
  } | null>
  findByResetToken(hashedToken: string): Promise<{
    id: string
    resetTokenExpires: Date | null
  } | null>
  setResetToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void>
  clearResetToken(userId: string): Promise<void>
  setEmailVerified(userId: string): Promise<void>
  updateProfile(
    userId: string,
    data: {
      fullName?: string
      phone?: string | null
      avatarUrl?: string | null
      dateOfBirth?: Date | null
      bio?: string | null
      whatsappOptIn?: boolean
      emergencyContactName?: string | null
      emergencyContactPhone?: string | null
    },
    tx?: DbClient,
  ): Promise<UserProfile>
  updatePassword(userId: string, passwordHash: string): Promise<void>
  findByEmailForLogin(email: string): Promise<{
    id: string
    email: string
    fullName: string
    role: string
    isActive: boolean
    passwordHash: string
  } | null>
  findByIdForMe(id: string): Promise<UserProfile | null>
  findByEmail(email: string): Promise<{ id: string } | null>
  findActiveByEmail(email: string): Promise<{ id: string } | null>
  findByIdWithRole(id: string): Promise<{ id: string; role: string } | null>
  create(data: {
    fullName: string
    email: string
    passwordHash: string
    role: string
  }): Promise<{
    id: string
    role: string
    fullName: string
    email: string
  }>
  listByIds(ids: string[]): Promise<Array<{ id: string; fullName: string }>>
}

const USER_PROFILE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  emailVerified: true,
  phone: true,
  avatarUrl: true,
  dateOfBirth: true,
  bio: true,
  whatsappOptIn: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createUserRepository(prisma: PrismaClient): UserRepository {
  return {
    async findEmailVerifiedById(id) {
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, emailVerified: true },
      })
    },

    async findByResetToken(hashedToken) {
      return prisma.user.findFirst({
        where: { resetToken: hashedToken },
        select: { id: true, resetTokenExpires: true },
      })
    },

    async setResetToken(userId, hashedToken, expiresAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { resetToken: hashedToken, resetTokenExpires: expiresAt },
      })
    },

    async clearResetToken(userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { resetToken: null, resetTokenExpires: null },
      })
    },

    async setEmailVerified(userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      })
    },

    async updateProfile(userId, data, tx) {
      const db = tx ?? prisma
      return db.user.update({
        where: { id: userId },
        data: {
          ...(data.fullName !== undefined && { fullName: data.fullName }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
          ...(data.dateOfBirth !== undefined && {
            dateOfBirth: data.dateOfBirth,
          }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.whatsappOptIn !== undefined && {
            whatsappOptIn: data.whatsappOptIn,
          }),
          ...(data.emergencyContactName !== undefined && {
            emergencyContactName: data.emergencyContactName,
          }),
          ...(data.emergencyContactPhone !== undefined && {
            emergencyContactPhone: data.emergencyContactPhone,
          }),
        },
        select: USER_PROFILE_SELECT,
      }) as Promise<UserProfile>
    },

    async updatePassword(userId, passwordHash) {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      })
    },

    async findByEmail(email) {
      const u = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })
      return u
    },

    async findActiveByEmail(email) {
      return prisma.user.findFirst({
        where: { email, isActive: true },
        select: { id: true },
      })
    },

    async findByEmailForLogin(email) {
      return prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          passwordHash: true,
        },
      })
    },

    async findByIdForMe(id) {
      return prisma.user.findUnique({
        where: { id },
        select: USER_PROFILE_SELECT,
      }) as Promise<UserProfile | null>
    },

    async findByIdWithRole(id) {
      return prisma.user.findUnique({
        where: { id, isActive: true },
        select: { id: true, role: true },
      })
    },

    async create(data) {
      return prisma.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
        },
        select: { id: true, role: true, fullName: true, email: true },
      })
    },
    async listByIds(ids) {
      if (ids.length === 0) return []
      return prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true },
      })
    },
  }
}
