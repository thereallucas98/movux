import type { NotificationRepository } from '~/server/repositories/notification.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export type GetMyUnreadCountResult =
  | { success: true; count: number }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function getMyUnreadNotificationCount(
  notificationRepo: NotificationRepository,
  principal: Principal | null,
): Promise<GetMyUnreadCountResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }
  const count = await notificationRepo.countUnreadForUser(principal.userId)
  return { success: true, count }
}
