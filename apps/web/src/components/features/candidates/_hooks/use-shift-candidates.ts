'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ShiftCandidateStatus } from '../candidate-status-tag'

export interface ShiftCandidateRow {
  id: string
  shiftId: string
  userId: string
  queuePosition: number
  status: ShiftCandidateStatus
  decidedByUserId: string | null
  decidedAt: string | null
  decisionReason: string | null
  resultingAssignmentId: string | null
  createdAt: string
  updatedAt: string
}

async function fetchCandidates(shiftId: string): Promise<ShiftCandidateRow[]> {
  const res = await fetch(`/api/shifts/${shiftId}/candidates`, {
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<ShiftCandidateRow[]>
}

export function useShiftCandidates(
  shiftId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['shift-candidates', shiftId],
    queryFn: () => fetchCandidates(shiftId),
    enabled: options?.enabled ?? true,
    meta: { silent: true },
  })
}
