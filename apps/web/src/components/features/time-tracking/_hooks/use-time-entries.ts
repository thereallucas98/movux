'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

interface ClockLocationRaw {
  lat: number
  lng: number
}

export interface TimeEntryRow {
  id: string
  shiftAssignmentId: string
  userId: string
  clockInAt: string
  clockInLocation: ClockLocationRaw | null
  clockInWithinTolerance: boolean
  clockOutAt: string | null
  clockOutLocation: ClockLocationRaw | null
  clockOutWithinTolerance: boolean | null
  overtimeMinutes: number
  closedByUserId: string | null
  closedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  shiftAssignment: {
    id: string
    shiftId: string
    userId: string | null
    status: string
    shift: {
      id: string
      scheduleId: string
      startAt: string
      endAt: string
      schedule: { workspaceId: string }
    }
    user: { id: string; fullName: string } | null
  }
}

interface PageResponse {
  data: TimeEntryRow[]
  nextCursor: string | null
}

export interface TimeEntriesFilters {
  from: Date | null
  to: Date | null
  userId: string | null
}

async function fetchPage(
  workspaceId: string,
  filters: TimeEntriesFilters,
  cursor: string | null,
): Promise<PageResponse> {
  const url = new URL(
    `/api/workspaces/${workspaceId}/time-entries`,
    window.location.origin,
  )
  url.searchParams.set('format', 'json')
  if (filters.from) url.searchParams.set('from', filters.from.toISOString())
  if (filters.to) url.searchParams.set('to', filters.to.toISOString())
  if (filters.userId) url.searchParams.set('userId', filters.userId)
  if (cursor) url.searchParams.set('cursor', cursor)
  url.searchParams.set('limit', '50')
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<PageResponse>
}

export function useTimeEntries(
  workspaceId: string,
  filters: TimeEntriesFilters,
) {
  const fromKey = filters.from?.toISOString() ?? ''
  const toKey = filters.to?.toISOString() ?? ''
  return useInfiniteQuery({
    queryKey: ['time-entries', workspaceId, fromKey, toKey, filters.userId],
    queryFn: ({ pageParam }) => fetchPage(workspaceId, filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    meta: { silent: true },
  })
}
