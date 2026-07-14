'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface SubmitSwapInput {
  type: 'SWAP'
  workspaceId: string
  swapSourceAssignmentId: string
  swapTargetUserId: string
  swapTargetAssignmentId: string
  reason: string
}

export interface SubmitOfferInput {
  type: 'OFFER'
  workspaceId: string
  offerSourceAssignmentId: string
  reason: string
}

export interface SubmitTimeOffInput {
  type: 'TIME_OFF'
  workspaceId: string
  timeOffStart: string
  timeOffEnd: string
  reason: string
  attachment?: File | null
}

export type SubmitRequestInput =
  | SubmitSwapInput
  | SubmitOfferInput
  | SubmitTimeOffInput

export function useSubmitRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitRequestInput) => {
      let res: Response
      if (input.type === 'TIME_OFF' && input.attachment) {
        const fd = new FormData()
        const { attachment, ...rest } = input
        fd.append('payload', JSON.stringify(rest))
        fd.append('attachment', attachment)
        res = await fetch('/api/requests', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        })
      } else {
        let body: unknown = input
        if (input.type === 'TIME_OFF') {
          const rest: Record<string, unknown> = { ...input }
          delete rest.attachment
          body = rest
        }
        res = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: (_data, variables) => {
      toast.success('Pedido criado')
      queryClient.invalidateQueries({
        queryKey: ['requests', variables.workspaceId],
      })
    },
    meta: { silent: true },
  })
}
