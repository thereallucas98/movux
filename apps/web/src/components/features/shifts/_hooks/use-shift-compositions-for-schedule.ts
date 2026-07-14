'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ShiftCompositionItem } from './use-shift-expected-composition'

interface BatchRow {
  shiftId: string
  specialtyId: string
  count: number
}

async function fetchBatch(
  workspaceId: string,
  scheduleId: string,
): Promise<BatchRow[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/expected-compositions`,
    { credentials: 'include' },
  )
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<BatchRow[]>
}

function groupByShift(rows: BatchRow[]): Map<string, ShiftCompositionItem[]> {
  const map = new Map<string, ShiftCompositionItem[]>()
  for (const row of rows) {
    const list = map.get(row.shiftId) ?? []
    list.push({ specialtyId: row.specialtyId, count: row.count })
    map.set(row.shiftId, list)
  }
  return map
}

export function useShiftCompositionsForSchedule(
  workspaceId: string,
  scheduleId: string,
) {
  return useQuery({
    queryKey: ['shift-compositions', scheduleId],
    queryFn: () => fetchBatch(workspaceId, scheduleId),
    select: groupByShift,
    meta: { silent: true },
  })
}
