import type {
  NotificationChannel,
  NotificationType,
  Prisma,
  PrismaClient,
} from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface NotificationPreferenceRow {
  id: string
  userId: string
  type: NotificationType
  channel: NotificationChannel
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PreferenceUpdate {
  type: NotificationType
  channel: NotificationChannel
  enabled: boolean
}

export interface NotificationPreferenceRepository {
  listForUser(
    userId: string,
    tx?: DbClient,
  ): Promise<NotificationPreferenceRow[]>
  upsertMany(
    userId: string,
    updates: PreferenceUpdate[],
    tx?: DbClient,
  ): Promise<NotificationPreferenceRow[]>
}

const PREF_SELECT = {
  id: true,
  userId: true,
  type: true,
  channel: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createNotificationPreferenceRepository(
  prisma: PrismaClient,
): NotificationPreferenceRepository {
  return {
    async listForUser(userId, tx) {
      const db = tx ?? prisma
      return db.notificationPreference.findMany({
        where: { userId },
        select: PREF_SELECT,
        orderBy: [{ type: 'asc' }, { channel: 'asc' }],
      })
    },

    async upsertMany(userId, updates, tx) {
      const db = tx ?? prisma
      // Sequential upsert keeps it simple; the patch payload is small (≤ 64 entries).
      const rows: NotificationPreferenceRow[] = []
      for (const u of updates) {
        const row = await db.notificationPreference.upsert({
          where: {
            userId_type_channel: {
              userId,
              type: u.type,
              channel: u.channel,
            },
          },
          create: {
            userId,
            type: u.type,
            channel: u.channel,
            enabled: u.enabled,
          },
          update: { enabled: u.enabled },
          select: PREF_SELECT,
        })
        rows.push(row)
      }
      return rows
    },
  }
}
