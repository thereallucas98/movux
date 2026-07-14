'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useDeleteSchedule(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return null
    },
    onSuccess: () => {
      toast.success('Escala removida')
      queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId] })
    },
    meta: { silent: true },
  })
}
