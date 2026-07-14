'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { TimelineEvent } from '../timeline-event-card'

interface PageResponse {
  data: TimelineEvent[]
  nextCursor: string | null
}

async function fetchPage(
  shiftId: string,
  order: 'asc' | 'desc',
  cursor: string | null,
): Promise<PageResponse> {
  const url = new URL(`/api/shifts/${shiftId}/timeline`, window.location.origin)
  url.searchParams.set('order', order)
  url.searchParams.set('limit', '50')
  if (cursor) url.searchParams.set('cursor', cursor)
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<PageResponse>
}

export function useShiftTimeline(
  shiftId: string,
  options?: { order?: 'asc' | 'desc' },
) {
  const order = options?.order ?? 'desc'
  return useInfiniteQuery({
    queryKey: ['shift-timeline', shiftId, order],
    queryFn: ({ pageParam }) => fetchPage(shiftId, order, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    meta: { silent: true },
  })
}
