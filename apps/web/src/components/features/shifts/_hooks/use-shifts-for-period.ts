'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ShiftRow } from './use-shifts'

async function fetchPeriod(
  workspaceId: string,
  scheduleId: string,
  from: Date,
  to: Date,
): Promise<ShiftRow[]> {
  const url = new URL(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts`,
    window.location.origin,
  )
  url.searchParams.set('fromAt', from.toISOString())
  url.searchParams.set('toAt', to.toISOString())
  url.searchParams.set('limit', '200')
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  const json = await (res.json() as Promise<{ data: ShiftRow[] }>)
  return json.data
}

export function useShiftsForPeriod(
  workspaceId: string,
  scheduleId: string,
  period: { from: Date; to: Date } | null,
) {
  return useQuery({
    queryKey: [
      'shifts-period',
      scheduleId,
      period?.from.toISOString() ?? null,
      period?.to.toISOString() ?? null,
    ],
    queryFn: () =>
      fetchPeriod(workspaceId, scheduleId, period!.from, period!.to),
    enabled: period !== null,
    meta: { silent: true },
  })
}
