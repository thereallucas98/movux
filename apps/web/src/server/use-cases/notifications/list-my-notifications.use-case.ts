import type {
  NotificationRepository,
  NotificationRow,
} from '~/server/repositories/notification.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListMyNotificationsInput {
  status?: 'unread' | 'all'
  cursor?: string | null
  limit?: number
}

export type ListMyNotificationsResult =
  | {
      success: true
      data: NotificationRow[]
      nextCursor: string | null
    }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function listMyNotifications(
  notificationRepo: NotificationRepository,
  principal: Principal | null,
  input: ListMyNotificationsInput,
): Promise<ListMyNotificationsResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
  const status = input.status ?? 'all'
  const page = await notificationRepo.listForUser({
    userId: principal.userId,
    status,
    cursor: input.cursor ?? null,
    limit,
  })
  return { success: true, data: page.data, nextCursor: page.nextCursor }
}
