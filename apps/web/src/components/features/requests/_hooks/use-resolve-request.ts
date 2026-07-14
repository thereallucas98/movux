'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface ResolveRequestInput {
  requestId: string
  decision: 'APPROVE' | 'REJECT'
  resolutionReason?: string
}

export function useResolveRequest(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      requestId,
      decision,
      resolutionReason,
    }: ResolveRequestInput) => {
      const body: Record<string, unknown> = { decision }
      if (resolutionReason && resolutionReason.length > 0) {
        body.resolutionReason = resolutionReason
      }
      const res = await fetch(`/api/requests/${requestId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.decision === 'APPROVE'
          ? 'Pedido aprovado'
          : 'Pedido rejeitado',
      )
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] })
    },
    meta: { silent: true },
  })
}
