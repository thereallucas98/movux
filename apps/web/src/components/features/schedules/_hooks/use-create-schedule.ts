'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface CreateScheduleInput {
  categoryId: string
  name?: string
  periodStart: string // ISO YYYY-MM-DD or full ISO
  periodEnd: string
}

export function useCreateSchedule(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Escala criada')
      queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId] })
    },
    meta: { silent: true },
  })
}
