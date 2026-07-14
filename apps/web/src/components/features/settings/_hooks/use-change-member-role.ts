'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { WorkspaceRole } from './use-workspace-with-members'

export interface ChangeRoleInput {
  memberId: string
  role: WorkspaceRole
}

export function useChangeMemberRole(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, role }: ChangeRoleInput) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role }),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Papel atualizado')
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
    },
    meta: { silent: true },
  })
}
