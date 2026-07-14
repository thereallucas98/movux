'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface UpdateScheduleInput {
  id: string
  categoryId?: string
  name?: string | null
  periodStart?: string
  periodEnd?: string
}

export function useUpdateSchedule(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateScheduleInput) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(patch),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Escala atualizada')
      queryClient.invalidateQueries({ queryKey: ['schedules', workspaceId] })
    },
    meta: { silent: true },
  })
}
