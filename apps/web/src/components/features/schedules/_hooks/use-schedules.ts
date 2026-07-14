'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ScheduleStatus } from '../schedule-status-tag'

export interface ScheduleRow {
  id: string
  workspaceId: string
  categoryId: string
  name: string | null
  periodStart: string
  periodEnd: string
  status: ScheduleStatus
  publishedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListFilters {
  status?: ScheduleStatus
  categoryId?: string
  from?: string
  to?: string
}

interface PageResponse {
  data: ScheduleRow[]
  nextCursor: string | null
}

async function fetchPage(
  workspaceId: string,
  filters: ListFilters,
  cursor: string | null,
): Promise<PageResponse> {
  const url = new URL(
    `/api/workspaces/${workspaceId}/schedules`,
    window.location.origin,
  )
  if (filters.status) url.searchParams.set('status', filters.status)
  if (filters.categoryId) url.searchParams.set('categoryId', filters.categoryId)
  if (filters.from) url.searchParams.set('from', filters.from)
  if (filters.to) url.searchParams.set('to', filters.to)
  if (cursor) url.searchParams.set('cursor', cursor)
  url.searchParams.set('limit', '20')
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<PageResponse>
}

export function useSchedules(workspaceId: string, filters: ListFilters) {
  return useInfiniteQuery({
    queryKey: ['schedules', workspaceId, filters],
    queryFn: ({ pageParam }) => fetchPage(workspaceId, filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    meta: { silent: true },
  })
}
