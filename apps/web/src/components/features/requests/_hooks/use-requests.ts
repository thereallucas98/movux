'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { RequestStatus } from '../request-status-tag'
import type { RequestType } from '../request-type-tag'

export interface RequestRow {
  id: string
  workspaceId: string
  type: RequestType
  status: RequestStatus
  requestedById: string
  resolvedById: string | null
  reason: string
  resolutionReason: string | null
  attachmentUrl: string | null
  attachmentMimeType: string | null
  attachmentSizeBytes: number | null
  swapSourceAssignmentId: string | null
  swapTargetUserId: string | null
  swapTargetAssignmentId: string | null
  peerAcceptedAt: string | null
  peerRejectedAt: string | null
  offerSourceAssignmentId: string | null
  timeOffStart: string | null
  timeOffEnd: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RequestShiftSummary {
  id: string
  scheduleId: string
  startAt: string
  endAt: string
  assignmentMode: string
  schedule: { workspaceId: string; status: string }
}

export interface RequestRelationAssignment {
  id: string
  shiftId: string
  userId: string | null
  status: string
  shift: RequestShiftSummary
}

export interface RequestWithRelationsRow extends RequestRow {
  swapSourceAssignment: RequestRelationAssignment | null
  swapTargetAssignment: RequestRelationAssignment | null
  offerSourceAssignment: RequestRelationAssignment | null
}

interface ListResponse {
  data: RequestWithRelationsRow[]
  nextCursor: string | null
}

async function fetchRequests(
  workspaceId: string,
  scope: 'mine' | 'workspace',
): Promise<RequestWithRelationsRow[]> {
  const url = new URL('/api/requests', window.location.origin)
  url.searchParams.set('workspaceId', workspaceId)
  url.searchParams.set('scope', scope)
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  const json = (await res.json()) as ListResponse
  return json.data
}

export function useRequests(workspaceId: string, scope: 'mine' | 'workspace') {
  return useQuery({
    queryKey: ['requests', workspaceId, scope],
    queryFn: () => fetchRequests(workspaceId, scope),
    meta: { silent: true },
  })
}
