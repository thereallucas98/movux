'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ShiftCandidateStatus } from '~/components/features/candidates/candidate-status-tag'

export interface MyOpenShiftRow {
  id: string
  scheduleId: string
  categoryId: string
  categoryName: string
  startAt: string
  endAt: string
  headcount: number
  activeAssignmentsCount: number
  myCandidacy: {
    id: string
    queuePosition: number
    status: ShiftCandidateStatus
  } | null
}

async function fetchOpen(): Promise<MyOpenShiftRow[]> {
  const res = await fetch('/api/me/open-shifts', { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<MyOpenShiftRow[]>
}

export function useMyOpenShifts() {
  return useQuery({
    queryKey: ['my-open-shifts'],
    queryFn: fetchOpen,
    meta: { silent: true },
  })
}
