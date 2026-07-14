'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

export type InviteRole = 'COORDENADOR' | 'COLABORADOR'

export interface AddMemberInput {
  email: string
  role: InviteRole
  specialtyId: string
}

export function useAddMember(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddMemberInput) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Membro adicionado')
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
    },
    meta: { silent: true },
  })
}
