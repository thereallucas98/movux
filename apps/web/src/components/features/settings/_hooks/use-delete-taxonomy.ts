'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { TaxonomyResource } from '../_adapters/types'

export function useDeleteTaxonomy(
  resource: TaxonomyResource,
  workspaceId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/${resource}/${id}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      return null
    },
    onSuccess: () => {
      toast.success('Removido')
      queryClient.invalidateQueries({
        queryKey: ['taxonomy', resource, workspaceId],
      })
    },
    meta: { silent: true },
  })
}
