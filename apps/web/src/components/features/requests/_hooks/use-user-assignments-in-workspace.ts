'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { AssignmentStatus } from '~/components/features/assignments/assignment-status-tag'

export interface UserAssignmentRow {
  id: string
  shiftId: string
  userId: string
  status: AssignmentStatus
  decisionDeadline: string
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
}

async function fetchPeerAssignments(
  workspaceId: string,
  userId: string,
  statuses: AssignmentStatus[],
): Promise<UserAssignmentRow[]> {
  const url = new URL(
    `/api/workspaces/${workspaceId}/members/${userId}/assignments`,
    window.location.origin,
  )
  if (statuses.length > 0) url.searchParams.set('status', statuses.join(','))
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<UserAssignmentRow[]>
}

export function useUserAssignmentsInWorkspace(
  workspaceId: string,
  userId: string | null,
  statuses: AssignmentStatus[],
) {
  const sortedKey = [...statuses].sort().join(',')
  return useQuery({
    queryKey: ['user-assignments', workspaceId, userId, sortedKey],
    queryFn: () => fetchPeerAssignments(workspaceId, userId ?? '', statuses),
    enabled: Boolean(userId),
    meta: { silent: true },
  })
}
