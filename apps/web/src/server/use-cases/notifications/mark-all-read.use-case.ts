import type { NotificationRepository } from '~/server/repositories/notification.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export type MarkAllReadResult =
  | { success: true; updated: number }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function markAllMyNotificationsRead(
  notificationRepo: NotificationRepository,
  principal: Principal | null,
): Promise<MarkAllReadResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }
  const updated = await notificationRepo.markAllReadForUser(principal.userId)
  return { success: true, updated }
}
