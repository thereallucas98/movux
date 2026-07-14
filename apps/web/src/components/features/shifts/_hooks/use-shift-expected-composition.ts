'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

interface CompositionRow {
  id: string
  shiftId: string
  specialtyId: string
  count: number
  createdAt: string
  updatedAt: string
}

export interface ShiftCompositionItem {
  specialtyId: string
  count: number
}

async function fetchComposition(
  workspaceId: string,
  scheduleId: string,
  shiftId: string,
): Promise<ShiftCompositionItem[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts/${shiftId}/expected-composition`,
    { credentials: 'include' },
  )
  if (!res.ok) throw await ApiError.fromResponse(res)
  const rows = (await res.json()) as CompositionRow[]
  return rows.map((r) => ({ specialtyId: r.specialtyId, count: r.count }))
}

export function useShiftExpectedComposition(
  workspaceId: string,
  scheduleId: string,
  shiftId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['shift-composition', shiftId],
    queryFn: () => fetchComposition(workspaceId, scheduleId, shiftId),
    enabled: options?.enabled ?? true,
    meta: { silent: true },
  })
}
