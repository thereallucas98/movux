'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { TaxonomyResource } from '../_adapters/types'

export interface UpdateTaxonomyInput {
  id: string
  name?: string
  description?: string | null
}

export function useUpdateTaxonomy(
  resource: TaxonomyResource,
  workspaceId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateTaxonomyInput) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/${resource}/${id}`,
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
      toast.success('Atualizado')
      queryClient.invalidateQueries({
        queryKey: ['taxonomy', resource, workspaceId],
      })
    },
    meta: { silent: true },
  })
}
