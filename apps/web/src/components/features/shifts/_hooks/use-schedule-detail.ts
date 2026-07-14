'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ScheduleStatus } from '~/components/features/schedules/schedule-status-tag'

export interface ScheduleDetail {
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

async function fetchSchedule(
  workspaceId: string,
  scheduleId: string,
): Promise<ScheduleDetail> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}`,
    { credentials: 'include' },
  )
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<ScheduleDetail>
}

export function useScheduleDetail(workspaceId: string, scheduleId: string) {
  return useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => fetchSchedule(workspaceId, scheduleId),
    meta: { silent: true },
  })
}
