'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useWithdrawCandidacy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (candidateId: string) => {
      const res = await fetch(`/api/candidates/${candidateId}/withdraw`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Candidatura retirada')
      queryClient.invalidateQueries({ queryKey: ['my-open-shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shift-candidates'] })
      queryClient.invalidateQueries({ queryKey: ['candidates-summary'] })
    },
    meta: { silent: true },
  })
}
