'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface CloseAssignmentInput {
  assignmentId: string
  notes?: string
}

export function useCloseAssignment(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ assignmentId, notes }: CloseAssignmentInput) => {
      const body = notes && notes.length > 0 ? { notes } : {}
      const res = await fetch(`/api/assignments/${assignmentId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Assignment fechado')
      queryClient.invalidateQueries({ queryKey: ['time-entries', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
    },
    meta: { silent: true },
  })
}
