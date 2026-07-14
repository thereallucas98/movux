'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { AssignmentStatus } from '~/components/features/assignments/assignment-status-tag'

export interface OpenTimeEntrySummary {
  id: string
  clockInAt: string
  clockInWithinTolerance: boolean
  clockOutAt: string | null
  clockOutWithinTolerance: boolean | null
  overtimeMinutes: number
  closedAt: string | null
}

export interface MyAssignmentRow {
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
  shift: {
    id: string
    scheduleId: string
    categoryId: string
    startAt: string
    endAt: string
    headcount: number
    status: string
    assignmentMode: string
    schedule: { workspaceId: string; status: string }
  }
  openTimeEntry: OpenTimeEntrySummary | null
}

async function fetchMy(
  statuses: AssignmentStatus[],
): Promise<MyAssignmentRow[]> {
  const url = new URL('/api/me/assignments', window.location.origin)
  if (statuses.length > 0) url.searchParams.set('status', statuses.join(','))
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<MyAssignmentRow[]>
}

export function useMyAssignments(statuses: AssignmentStatus[]) {
  const sortedKey = [...statuses].sort().join(',')
  return useQuery({
    queryKey: ['my-assignments', sortedKey],
    queryFn: () => fetchMy(statuses),
    meta: { silent: true },
  })
}
