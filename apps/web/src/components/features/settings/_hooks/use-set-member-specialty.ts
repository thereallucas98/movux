'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export interface SetMemberSpecialtyInput {
  memberId: string
  specialtyId: string
}

export function useSetMemberSpecialty(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ memberId, specialtyId }: SetMemberSpecialtyInput) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}/specialty`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ specialtyId }),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Profissão atualizada')
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
    },
    meta: { silent: true },
  })
}
