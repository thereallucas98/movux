'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useAcceptMyAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}/accept`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Atribuição aceita')
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['shift-assignments-batch'] })
      queryClient.invalidateQueries({ queryKey: ['shift-assignment-detail'] })
    },
    meta: { silent: true },
  })
}
