'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useCloseSchedule(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/close`,
        { method: 'POST', credentials: 'include' },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Escala encerrada')
      queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId] })
    },
    meta: { silent: true },
  })
}
