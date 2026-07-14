import type { NotificationType } from '~/generated/prisma/client'
import type { AnyNotificationPayload } from '~/server/notifications/payloads'

export interface NotificationRow {
  id: string
  userId: string
  workspaceId: string
  type: NotificationType
  payload: AnyNotificationPayload
  readAt: string | null
  createdAt: string
}

export interface NotificationsPage {
  data: NotificationRow[]
  nextCursor: string | null
}
