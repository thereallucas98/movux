'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

export interface ShiftPattern {
  id: string
  scheduleId: string
  categoryId: string
  name: string | null
  daysOfWeek: number[]
  startTimeMinutes: number
  endTimeMinutes: number
  crossesMidnight: boolean
  headcount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

async function fetchPatterns(
  workspaceId: string,
  scheduleId: string,
): Promise<ShiftPattern[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/patterns`,
    { credentials: 'include' },
  )
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<ShiftPattern[]>
}

export function useShiftPatterns(
  workspaceId: string,
  scheduleId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['shift-patterns', scheduleId],
    queryFn: () => fetchPatterns(workspaceId, scheduleId),
    enabled: options?.enabled ?? true,
    meta: { silent: true },
  })
}
