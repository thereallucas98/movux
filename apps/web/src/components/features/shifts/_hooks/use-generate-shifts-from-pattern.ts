'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

export interface GenerateShiftsFromPatternInput {
  patternId: string
  rangeStart: string
  rangeEnd: string
}

export interface GenerateShiftsFromPatternResult {
  generated: number
  skipped: number
}

export function useGenerateShiftsFromPattern(
  workspaceId: string,
  scheduleId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      patternId,
      rangeStart,
      rangeEnd,
    }: GenerateShiftsFromPatternInput): Promise<GenerateShiftsFromPatternResult> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/patterns/${patternId}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ rangeStart, rangeEnd }),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json() as Promise<GenerateShiftsFromPatternResult>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', scheduleId] })
    },
    meta: { silent: true },
  })
}
