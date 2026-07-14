import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import type { NotificationRow } from './types'

interface InfinitePage {
  data: NotificationRow[]
  nextCursor: string | null
}

interface UnreadCountPayload {
  count: number
}

const KEY_RECENT = ['my-notifications', 'recent'] as const
const KEY_UNREAD_INF = ['my-notifications', 'unread', 'infinite'] as const
const KEY_ALL_INF = ['my-notifications', 'all', 'infinite'] as const
const KEY_UNREAD_COUNT = ['my-notifications', 'unread-count'] as const

export interface NotificationCacheSnapshot {
  recent: NotificationRow[] | undefined
  unreadInf: InfiniteData<InfinitePage> | undefined
  allInf: InfiniteData<InfinitePage> | undefined
  unreadCount: UnreadCountPayload | undefined
}

export function takeSnapshot(
  queryClient: QueryClient,
): NotificationCacheSnapshot {
  return {
    recent: queryClient.getQueryData(KEY_RECENT),
    unreadInf: queryClient.getQueryData(KEY_UNREAD_INF),
    allInf: queryClient.getQueryData(KEY_ALL_INF),
    unreadCount: queryClient.getQueryData(KEY_UNREAD_COUNT),
  }
}

export function restoreSnapshot(
  queryClient: QueryClient,
  snapshot: NotificationCacheSnapshot,
): void {
  queryClient.setQueryData(KEY_RECENT, snapshot.recent)
  queryClient.setQueryData(KEY_UNREAD_INF, snapshot.unreadInf)
  queryClient.setQueryData(KEY_ALL_INF, snapshot.allInf)
  queryClient.setQueryData(KEY_UNREAD_COUNT, snapshot.unreadCount)
}

/**
 * Optimistically mark a single notification as read across every cached list.
 * Decrements unread-count and removes from the unread infinite list.
 */
export function patchOneAsRead(
  queryClient: QueryClient,
  id: string,
  readAt: Date,
): void {
  const readAtIso = readAt.toISOString()
  // Recent (limit=10)
  queryClient.setQueryData<NotificationRow[]>(KEY_RECENT, (prev) =>
    prev
      ? prev.map((n) => (n.id === id ? { ...n, readAt: readAtIso } : n))
      : prev,
  )

  // Unread infinite — drop the row entirely (it's no longer unread)
  queryClient.setQueryData<InfiniteData<InfinitePage>>(
    KEY_UNREAD_INF,
    (prev) =>
      prev
        ? {
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              data: page.data.filter((n) => n.id !== id),
            })),
          }
        : prev,
  )

  // All infinite — set readAt
  queryClient.setQueryData<InfiniteData<InfinitePage>>(KEY_ALL_INF, (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            data: page.data.map((n) =>
              n.id === id ? { ...n, readAt: readAtIso } : n,
            ),
          })),
        }
      : prev,
  )

  // Decrement unread count, floor at 0
  queryClient.setQueryData<UnreadCountPayload>(KEY_UNREAD_COUNT, (prev) =>
    prev ? { count: Math.max(0, prev.count - 1) } : prev,
  )
}

/**
 * Optimistically mark every cached notification as read. Used by mark-all.
 */
export function patchAllAsRead(queryClient: QueryClient, readAt: Date): void {
  const readAtIso = readAt.toISOString()
  queryClient.setQueryData<NotificationRow[]>(KEY_RECENT, (prev) =>
    prev ? prev.map((n) => ({ ...n, readAt: n.readAt ?? readAtIso })) : prev,
  )

  queryClient.setQueryData<InfiniteData<InfinitePage>>(
    KEY_UNREAD_INF,
    (prev) =>
      prev
        ? {
            ...prev,
            pages: prev.pages.map((page) => ({ ...page, data: [] })),
          }
        : prev,
  )

  queryClient.setQueryData<InfiniteData<InfinitePage>>(KEY_ALL_INF, (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            data: page.data.map((n) => ({
              ...n,
              readAt: n.readAt ?? readAtIso,
            })),
          })),
        }
      : prev,
  )

  queryClient.setQueryData<UnreadCountPayload>(KEY_UNREAD_COUNT, { count: 0 })
}

export const NOTIFICATION_CACHE_KEYS = {
  recent: KEY_RECENT,
  unreadInfinite: KEY_UNREAD_INF,
  allInfinite: KEY_ALL_INF,
  unreadCount: KEY_UNREAD_COUNT,
} as const
