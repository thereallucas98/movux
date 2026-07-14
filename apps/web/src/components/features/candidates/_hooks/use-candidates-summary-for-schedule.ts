'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

interface SummaryRow {
  shiftId: string
  queuedCount: number
}

async function fetchSummary(
  workspaceId: string,
  scheduleId: string,
): Promise<SummaryRow[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/candidates-summary`,
    { credentials: 'include' },
  )
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<SummaryRow[]>
}

function toMap(rows: SummaryRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.shiftId, r.queuedCount)
  return map
}

export function useCandidatesSummaryForSchedule(
  workspaceId: string,
  scheduleId: string,
) {
  return useQuery({
    queryKey: ['candidates-summary', scheduleId],
    queryFn: () => fetchSummary(workspaceId, scheduleId),
    select: toMap,
    meta: { silent: true },
  })
}
