'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export function useUnsetMemberSpecialty(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}/specialty`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return null
    },
    onSuccess: () => {
      toast.success('Profissão removida')
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
    },
    meta: { silent: true },
  })
}
