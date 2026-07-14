'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { AssignmentStatus } from '../assignment-status-tag'

interface BatchRow {
  shiftId: string
  userId: string
  status: AssignmentStatus
  decisionDeadline: string
}

export interface ScheduleAssignmentItem {
  userId: string
  status: AssignmentStatus
  decisionDeadline: string
}

async function fetchBatch(
  workspaceId: string,
  scheduleId: string,
): Promise<BatchRow[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/assignments`,
    { credentials: 'include' },
  )
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<BatchRow[]>
}

function groupByShift(rows: BatchRow[]): Map<string, ScheduleAssignmentItem[]> {
  const map = new Map<string, ScheduleAssignmentItem[]>()
  for (const row of rows) {
    const list = map.get(row.shiftId) ?? []
    list.push({
      userId: row.userId,
      status: row.status,
      decisionDeadline: row.decisionDeadline,
    })
    map.set(row.shiftId, list)
  }
  return map
}

export function useShiftAssignmentsForSchedule(
  workspaceId: string,
  scheduleId: string,
) {
  return useQuery({
    queryKey: ['shift-assignments-batch', scheduleId],
    queryFn: () => fetchBatch(workspaceId, scheduleId),
    select: groupByShift,
    meta: { silent: true },
  })
}
