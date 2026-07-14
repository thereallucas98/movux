import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'
import type { NotificationPreferenceRepository } from '~/server/repositories/notification-preference.repository'
import {
  ALL_CHANNELS,
  ALL_NOTIFICATION_TYPES,
  DEFAULT_ENABLED_BY_CHANNEL,
} from '~/server/notifications/preferences-defaults'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface PreferenceItem {
  type: NotificationType
  channel: NotificationChannel
  enabled: boolean
}

export type GetMyPreferencesResult =
  | { success: true; data: PreferenceItem[] }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function getMyNotificationPreferences(
  notificationPreferenceRepo: NotificationPreferenceRepository,
  principal: Principal | null,
): Promise<GetMyPreferencesResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }
  const stored = await notificationPreferenceRepo.listForUser(principal.userId)
  const explicit = new Map(
    stored.map((r) => [`${r.type}:${r.channel}`, r.enabled]),
  )
  const data: PreferenceItem[] = []
  for (const type of ALL_NOTIFICATION_TYPES) {
    for (const channel of ALL_CHANNELS) {
      const v = explicit.get(`${type}:${channel}`)
      data.push({
        type,
        channel,
        enabled: v ?? DEFAULT_ENABLED_BY_CHANNEL[channel],
      })
    }
  }
  return { success: true, data }
}
