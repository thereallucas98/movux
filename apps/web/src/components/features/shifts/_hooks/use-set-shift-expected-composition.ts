'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { ShiftCompositionItem } from './use-shift-expected-composition'

export interface SetShiftExpectedCompositionInput {
  items: ShiftCompositionItem[]
}

export function useSetShiftExpectedComposition(
  workspaceId: string,
  scheduleId: string,
  shiftId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ items }: SetShiftExpectedCompositionInput) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts/${shiftId}/expected-composition`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items }),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.items.length === 0
          ? 'Composição removida'
          : 'Composição salva',
      )
      queryClient.invalidateQueries({
        queryKey: ['shift-composition', shiftId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shift-compositions', scheduleId],
      })
    },
    meta: { silent: true },
  })
}
