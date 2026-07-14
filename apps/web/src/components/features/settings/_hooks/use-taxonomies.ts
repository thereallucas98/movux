'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

import type { TaxonomyResource, TaxonomyRow } from '../_adapters/types'

async function fetchList(
  resource: TaxonomyResource,
  workspaceId: string,
): Promise<TaxonomyRow[]> {
  const res = await fetch(`/api/workspaces/${workspaceId}/${resource}`, {
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  const json = (await res.json()) as TaxonomyRow[]
  return json
}

export function useTaxonomies(resource: TaxonomyResource, workspaceId: string) {
  return useQuery({
    queryKey: ['taxonomy', resource, workspaceId],
    queryFn: () => fetchList(resource, workspaceId),
    meta: { silent: true },
  })
}
