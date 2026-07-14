'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

interface ApplyResponse {
  id: string
  shiftId: string
  queuePosition: number
}

export function useApplyToShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (shiftId: string): Promise<ApplyResponse> => {
      const res = await fetch(`/api/shifts/${shiftId}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json() as Promise<ApplyResponse>
    },
    onSuccess: (data) => {
      toast.success(`Inscrito! Você é o nº ${data.queuePosition} na fila`)
      queryClient.invalidateQueries({ queryKey: ['my-open-shifts'] })
      queryClient.invalidateQueries({
        queryKey: ['shift-candidates', data.shiftId],
      })
      queryClient.invalidateQueries({ queryKey: ['candidates-summary'] })
    },
    meta: { silent: true },
  })
}
