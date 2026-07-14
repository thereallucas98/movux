'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface RejectMyAssignmentInput {
  assignmentId: string
  reason: string
}

export function useRejectMyAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ assignmentId, reason }: RejectMyAssignmentInput) => {
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
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['shift-assignments-batch'] })
      queryClient.invalidateQueries({ queryKey: ['shift-assignment-detail'] })
    },
    meta: { silent: true },
  })
}
