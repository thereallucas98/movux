import type { NotificationChannel, PrismaClient } from '~/generated/prisma/client'

export interface NotificationLogRepository {
  create(
    userId: string,
    channel: NotificationChannel,
    templateCode: string,
    status: 'SENT' | 'FAILED',
    metadata?: object,
  ): Promise<void>
}

export function createNotificationLogRepository(
  prisma: PrismaClient,
): NotificationLogRepository {
  return {
    async create(userId, channel, templateCode, status, metadata) {
      await prisma.notificationLog.create({
        data: {
          userId,
          channel,
          templateCode,
          status,
          metadata,
          sentAt: status === 'SENT' ? new Date() : null,
        },
      })
    },
  }
}
