'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useDeleteShift(workspaceId: string, scheduleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts/${shiftId}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return null
    },
    onSuccess: () => {
      toast.success('Turno removido')
      queryClient.invalidateQueries({ queryKey: ['shifts', scheduleId] })
    },
    meta: { silent: true },
  })
}
