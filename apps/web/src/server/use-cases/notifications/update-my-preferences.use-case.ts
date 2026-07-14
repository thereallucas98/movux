import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'
import type {
  NotificationPreferenceRepository,
  PreferenceUpdate,
} from '~/server/repositories/notification-preference.repository'
import type { Principal } from '../tenants/create-tenant.use-case'
import {
  getMyNotificationPreferences,
  type PreferenceItem,
} from './get-my-preferences.use-case'

export interface UpdateMyPreferencesInput {
  updates: Array<{
    type: NotificationType
    channel: NotificationChannel
    enabled: boolean
  }>
}

export type UpdateMyPreferencesResult =
  | { success: true; data: PreferenceItem[] }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function updateMyNotificationPreferences(
  notificationPreferenceRepo: NotificationPreferenceRepository,
  principal: Principal | null,
  input: UpdateMyPreferencesInput,
): Promise<UpdateMyPreferencesResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }
  const updates: PreferenceUpdate[] = input.updates.map((u) => ({
    type: u.type,
    channel: u.channel,
    enabled: u.enabled,
  }))
  await notificationPreferenceRepo.upsertMany(principal.userId, updates)
  return getMyNotificationPreferences(notificationPreferenceRepo, principal)
}
