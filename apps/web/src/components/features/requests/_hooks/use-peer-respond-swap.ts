'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface PeerRespondInput {
  requestId: string
  decision: 'ACCEPT' | 'REJECT'
}

export function usePeerRespondSwap(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId, decision }: PeerRespondInput) => {
      const res = await fetch(`/api/requests/${requestId}/peer-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.decision === 'ACCEPT' ? 'Troca aceita' : 'Troca rejeitada',
      )
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] })
    },
    meta: { silent: true },
  })
}
