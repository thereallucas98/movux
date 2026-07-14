'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface ApproveCandidateInput {
  candidateId: string
  autoAccept: boolean
}

export function useApproveCandidate(scheduleId: string, shiftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ candidateId, autoAccept }: ApproveCandidateInput) => {
      const res = await fetch(`/api/candidates/${candidateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ autoAccept }),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Candidato aprovado')
      queryClient.invalidateQueries({ queryKey: ['shift-candidates', shiftId] })
      queryClient.invalidateQueries({
        queryKey: ['candidates-summary', scheduleId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shift-assignments-batch', scheduleId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shift-assignment-detail', shiftId],
      })
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
    },
    meta: { silent: true },
  })
}
