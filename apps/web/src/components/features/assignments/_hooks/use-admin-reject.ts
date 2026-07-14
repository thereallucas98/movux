'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface AdminRejectInput {
  assignmentId: string
  reason: string
}

export function useAdminReject(scheduleId: string, shiftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ assignmentId, reason }: AdminRejectInput) => {
      const res = await fetch(`/api/assignments/${assignmentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Atribuição rejeitada')
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
