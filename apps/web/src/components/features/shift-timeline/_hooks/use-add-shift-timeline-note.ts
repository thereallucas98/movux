'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useAddShiftTimelineNote(shiftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note: string) => {
      const res = await fetch(`/api/shifts/${shiftId}/timeline/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note }),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Nota adicionada')
      queryClient.invalidateQueries({
        queryKey: ['shift-timeline', shiftId],
      })
    },
    meta: { silent: true },
  })
}
