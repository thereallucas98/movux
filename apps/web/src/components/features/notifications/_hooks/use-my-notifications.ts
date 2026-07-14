'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { NotificationRow, NotificationsPage } from './_lib/types'

async function fetchPage(
  status: 'unread' | 'all',
  cursor: string | null,
): Promise<NotificationsPage> {
  const url = new URL('/api/me/notifications', window.location.origin)
  url.searchParams.set('status', status)
  url.searchParams.set('limit', '50')
  if (cursor) url.searchParams.set('cursor', cursor)
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<NotificationsPage>
}

export function useMyNotifications(status: 'unread' | 'all') {
  return useInfiniteQuery({
    queryKey: ['my-notifications', status, 'infinite'],
    queryFn: ({ pageParam }) => fetchPage(status, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    meta: { silent: true },
  })
}

async function fetchRecent(): Promise<NotificationRow[]> {
  const url = new URL('/api/me/notifications', window.location.origin)
  url.searchParams.set('status', 'all')
  url.searchParams.set('limit', '10')
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  const body = (await res.json()) as NotificationsPage
  return body.data
}

export function useRecentNotifications() {
  return useQuery({
    queryKey: ['my-notifications', 'recent'],
    queryFn: fetchRecent,
    meta: { silent: true },
  })
}
