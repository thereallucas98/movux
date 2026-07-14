'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface RejectCandidateInput {
  candidateId: string
  reason?: string
}

export function useRejectCandidate(scheduleId: string, shiftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ candidateId, reason }: RejectCandidateInput) => {
      const res = await fetch(`/api/candidates/${candidateId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(reason ? { reason } : {}),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Candidato rejeitado')
      queryClient.invalidateQueries({ queryKey: ['shift-candidates', shiftId] })
      queryClient.invalidateQueries({
        queryKey: ['candidates-summary', scheduleId],
      })
    },
    meta: { silent: true },
  })
}
