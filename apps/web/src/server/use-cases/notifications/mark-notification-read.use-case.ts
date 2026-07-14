import type {
  NotificationRepository,
  NotificationRow,
} from '~/server/repositories/notification.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface MarkNotificationReadInput {
  id: string
}

export type MarkNotificationReadResult =
  | { success: true; data: NotificationRow }
  | { success: false; code: 'UNAUTHENTICATED' | 'NOT_FOUND' }

export async function markNotificationRead(
  notificationRepo: NotificationRepository,
  principal: Principal | null,
  input: MarkNotificationReadInput,
): Promise<MarkNotificationReadResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }
  const existing = await notificationRepo.findByIdForUser(
    input.id,
    principal.userId,
  )
  if (!existing) return { success: false, code: 'NOT_FOUND' }
  // Idempotent: a second call returns the existing row without touching readAt.
  if (existing.readAt) return { success: true, data: existing }
  const updated = await notificationRepo.markRead(input.id)
  return { success: true, data: updated }
}
