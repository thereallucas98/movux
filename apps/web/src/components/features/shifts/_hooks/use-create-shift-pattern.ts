'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { ShiftPattern } from './use-shift-patterns'

export interface CreateShiftPatternInput {
  categoryId: string
  name?: string | null
  daysOfWeek: number[]
  startTimeMinutes: number
  endTimeMinutes: number
  crossesMidnight: boolean
  headcount: number
}

export function useCreateShiftPattern(workspaceId: string, scheduleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: CreateShiftPatternInput,
    ): Promise<ShiftPattern> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/patterns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json() as Promise<ShiftPattern>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shift-patterns', scheduleId],
      })
    },
    meta: { silent: true },
  })
}
