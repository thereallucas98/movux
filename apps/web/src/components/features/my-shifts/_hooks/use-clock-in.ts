'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface ClockInInput {
  assignmentId: string
  lat?: number
  lng?: number
}

export function useClockIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ assignmentId, lat, lng }: ClockInInput) => {
      const body: Record<string, number> = {}
      if (typeof lat === 'number' && typeof lng === 'number') {
        body.lat = lat
        body.lng = lng
      }
      const res = await fetch(`/api/assignments/${assignmentId}/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ponto registrado')
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
    },
    meta: { silent: true },
  })
}
