'use client'

import { useQuery } from '@tanstack/react-query'

import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'
import { ApiError } from '~/lib/api-error'

export interface PreferenceItem {
  type: NotificationType
  channel: NotificationChannel
  enabled: boolean
}

interface PreferencesResponse {
  data: PreferenceItem[]
}

async function fetchPreferences(): Promise<PreferenceItem[]> {
  const res = await fetch('/api/me/notification-preferences', {
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  const body = (await res.json()) as PreferencesResponse
  return body.data
}

export function useMyNotificationPreferences() {
  return useQuery({
    queryKey: ['my-notification-preferences'],
    queryFn: fetchPreferences,
    meta: { silent: true },
  })
}
