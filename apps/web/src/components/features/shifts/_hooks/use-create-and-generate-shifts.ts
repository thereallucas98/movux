'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { CreateShiftPatternInput } from './use-create-shift-pattern'
import type { GenerateShiftsFromPatternResult } from './use-generate-shifts-from-pattern'

export interface CreateAndGenerateInput {
  definition: CreateShiftPatternInput
  range: { rangeStart: string; rangeEnd: string }
}

/**
 * Two-phase mutation: POST /patterns → POST /patterns/[id]/generate.
 * Returns the generation summary; the orchestrating wizard owns the toast.
 *
 * If POST /generate fails, the created pattern persists and is recoverable
 * via the saved-patterns shortcut in the wizard's step 1.
 */
export function useCreateAndGenerateShifts(
  workspaceId: string,
  scheduleId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      definition,
      range,
    }: CreateAndGenerateInput): Promise<GenerateShiftsFromPatternResult> => {
      const createRes = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/patterns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(definition),
        },
      )
      if (!createRes.ok) throw await ApiError.fromResponse(createRes)
      const created = (await createRes.json()) as { id: string }

      const genRes = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/patterns/${created.id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(range),
        },
      )
      if (!genRes.ok) throw await ApiError.fromResponse(genRes)
      return genRes.json() as Promise<GenerateShiftsFromPatternResult>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', scheduleId] })
      queryClient.invalidateQueries({
        queryKey: ['shift-patterns', scheduleId],
      })
    },
    meta: { silent: true },
  })
}
