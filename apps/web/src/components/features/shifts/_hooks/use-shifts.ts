'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ShiftAssignmentMode } from '../shift-assignment-mode-tag'

export type ShiftStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'

export interface ShiftRow {
  id: string
  scheduleId: string
  categoryId: string
  patternId: string | null
  startAt: string
  endAt: string
  headcount: number
  status: ShiftStatus
  assignmentMode: ShiftAssignmentMode
  decisionWindowHours: number
  notes: string | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string
}

interface PageResponse {
  data: ShiftRow[]
  nextCursor: string | null
}

async function fetchPage(
  workspaceId: string,
  scheduleId: string,
  cursor: string | null,
): Promise<PageResponse> {
  const url = new URL(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts`,
    window.location.origin,
  )
  if (cursor) url.searchParams.set('cursor', cursor)
  url.searchParams.set('limit', '20')
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<PageResponse>
}

export function useShifts(workspaceId: string, scheduleId: string) {
  return useInfiniteQuery({
    queryKey: ['shifts', scheduleId],
    queryFn: ({ pageParam }) => fetchPage(workspaceId, scheduleId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    meta: { silent: true },
  })
}
