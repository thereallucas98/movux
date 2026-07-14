'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { ShiftAssignmentMode } from '../shift-assignment-mode-tag'

export interface UpdateShiftInput {
  id: string
  categoryId?: string
  startAt?: string
  endAt?: string
  headcount?: number
  notes?: string | null
  assignmentMode?: ShiftAssignmentMode
}

export function useUpdateShift(workspaceId: string, scheduleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateShiftInput) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/schedules/${scheduleId}/shifts/${id}`,
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
      toast.success('Turno atualizado')
      queryClient.invalidateQueries({ queryKey: ['shifts', scheduleId] })
    },
    meta: { silent: true },
  })
}
