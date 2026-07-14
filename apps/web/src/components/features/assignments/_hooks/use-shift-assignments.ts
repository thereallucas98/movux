'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { AssignmentStatus } from '../assignment-status-tag'
import type { CompositionStatus } from '../composition-match-tag'

export interface AssignmentRow {
  id: string
  shiftId: string
  userId: string
  assignedByUserId: string
  status: AssignmentStatus
  decisionDeadline: string
  decidedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  compositionStatus: CompositionStatus
}

async function fetchAssignments(
  workspaceId: string,
  scheduleId: string,
  shiftId: string,
): Promise<AssignmentRow[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts/${shiftId}/assignments`,
    { credentials: 'include' },
  )
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<AssignmentRow[]>
}

export function useShiftAssignments(
  workspaceId: string,
  scheduleId: string,
  shiftId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['shift-assignment-detail', shiftId],
    queryFn: () => fetchAssignments(workspaceId, scheduleId, shiftId),
    enabled: options?.enabled ?? true,
    meta: { silent: true },
  })
}
