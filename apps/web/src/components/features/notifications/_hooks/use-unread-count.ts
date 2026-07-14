'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

interface UnreadCountResponse {
  count: number
}

async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const res = await fetch('/api/me/notifications/unread-count', {
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<UnreadCountResponse>
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['my-notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    meta: { silent: true },
  })
}
