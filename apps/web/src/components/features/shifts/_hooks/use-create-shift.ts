'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface CreateShiftInput {
  categoryId: string
  startAt: string
  endAt: string
  headcount: number
  notes?: string
}

export function useCreateShift(workspaceId: string, scheduleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateShiftInput) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Turno criado')
      queryClient.invalidateQueries({ queryKey: ['shifts', scheduleId] })
    },
    meta: { silent: true },
  })
}
