'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useAssignUsers(
  workspaceId: string,
  scheduleId: string,
  shiftId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts/${shiftId}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userIds }),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: (_data, variables) => {
      const count = variables.length
      toast.success(
        count === 1
          ? '1 colaborador atribuído'
          : `${count} colaboradores atribuídos`,
      )
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
