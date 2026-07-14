'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { TaxonomyResource } from '../_adapters/types'

export interface CreateTaxonomyInput {
  slug: string
  name: string
  description?: string
}

export function useCreateTaxonomy(
  resource: TaxonomyResource,
  workspaceId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaxonomyInput) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Adicionado')
      queryClient.invalidateQueries({
        queryKey: ['taxonomy', resource, workspaceId],
      })
    },
    meta: { silent: true },
  })
}
