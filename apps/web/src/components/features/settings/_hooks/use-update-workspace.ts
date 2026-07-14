'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { WorkspaceVertical } from './use-workspace-with-members'

export interface UpdateWorkspaceInput {
  name?: string
  timezone?: string
  vertical?: WorkspaceVertical
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceInput) => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Workspace atualizado')
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      // Refresh so AppShell switcher labels reflect the new name.
      router.refresh()
    },
    meta: { silent: true },
  })
}
