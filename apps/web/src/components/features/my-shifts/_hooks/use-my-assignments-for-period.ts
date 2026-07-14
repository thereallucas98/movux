'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { AssignmentStatus } from '~/components/features/assignments/assignment-status-tag'
import type { MyAssignmentRow } from './use-my-assignments'

async function fetchPeriod(
  statuses: AssignmentStatus[],
  from: Date,
  to: Date,
): Promise<MyAssignmentRow[]> {
  const url = new URL('/api/me/assignments', window.location.origin)
  if (statuses.length > 0) url.searchParams.set('status', statuses.join(','))
  url.searchParams.set('from', from.toISOString())
  url.searchParams.set('to', to.toISOString())
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<MyAssignmentRow[]>
}

export function useMyAssignmentsForPeriod(
  statuses: AssignmentStatus[],
  period: { from: Date; to: Date } | null,
) {
  const sortedKey = [...statuses].sort().join(',')
  return useQuery({
    queryKey: [
      'my-assignments-period',
      sortedKey,
      period?.from.toISOString() ?? null,
      period?.to.toISOString() ?? null,
    ],
    queryFn: () => fetchPeriod(statuses, period!.from, period!.to),
    enabled: period !== null,
    meta: { silent: true },
  })
}
