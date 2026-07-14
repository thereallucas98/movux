'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useForceAccept(scheduleId: string, shiftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}/force-accept`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Aceite forçado')
      queryClient.invalidateQueries({
        queryKey: ['shift-assignment-detail', shiftId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shift-assignments-batch', scheduleId],
      })
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
    },
    meta: { silent: true },
  })
}
