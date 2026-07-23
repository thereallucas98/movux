import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationLog,
  PrismaClient,
} from '~/generated/prisma/client'

export interface ListNotificationsFilter {
  status?: NotificationDeliveryStatus
  cursor?: string
  limit?: number
}

export interface NotificationLogRepository {
  create(
    userId: string,
    channel: NotificationChannel,
    templateCode: string,
    status: 'SENT' | 'FAILED',
    metadata?: object,
  ): Promise<void>
  findById(id: string): Promise<NotificationLog | null>
  findByStatus(
    filter: ListNotificationsFilter,
  ): Promise<{ data: NotificationLog[]; nextCursor: string | null }>
  markSent(id: string, providerMessageId: string | null): Promise<void>
  markFailedAgain(id: string, error: string): Promise<void>
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

    async findById(id) {
      return prisma.notificationLog.findUnique({ where: { id } })
    },

    async findByStatus(filter) {
      const limit = filter.limit ?? 20
      const data = await prisma.notificationLog.findMany({
        where: filter.status ? { status: filter.status } : {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      })

      const hasMore = data.length > limit
      const page = hasMore ? data.slice(0, limit) : data
      const nextCursor = hasMore ? page[page.length - 1].id : null

      return { data: page, nextCursor }
    },

    async markSent(id, providerMessageId) {
      const existing = await prisma.notificationLog.findUnique({
        where: { id },
        select: { metadata: true },
      })
      const metadata =
        (existing?.metadata as Record<string, unknown> | null) ?? {}
      await prisma.notificationLog.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          metadata: { ...metadata, providerMessageId },
        },
      })
    },

    async markFailedAgain(id, error) {
      const existing = await prisma.notificationLog.findUnique({
        where: { id },
        select: { metadata: true },
      })
      const metadata =
        (existing?.metadata as Record<string, unknown> | null) ?? {}
      await prisma.notificationLog.update({
        where: { id },
        data: { status: 'FAILED', metadata: { ...metadata, error } },
      })
    },
  }
}
