'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useUnassignUser(
  workspaceId: string,
  scheduleId: string,
  shiftId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts/${shiftId}/assignments/${assignmentId}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return null
    },
    onSuccess: () => {
      toast.success('Atribuição cancelada')
      queryClient.invalidateQueries({
        queryKey: ['shift-assignment-detail', shiftId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shift-assignments-batch', scheduleId],
      })
    },
    meta: { silent: true },
  })
}
