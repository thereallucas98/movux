'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useCancelRequest(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/requests/${requestId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Pedido cancelado')
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] })
    },
    meta: { silent: true },
  })
}
