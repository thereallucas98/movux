'use client'

import { useQuery } from '@tanstack/react-query'

import {
  NeighborhoodsDocument,
  type NeighborhoodsQuery,
  type NeighborhoodsQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export interface NeighborhoodOption {
  id: string
  name: string
  cityId: string
  cityName: string
  stateUf: string
}

// campos são non-null no schema Pothos; codegen marca tudo opcional por
// padrão (typescript-operations) — normaliza aqui pra não repetir o
// null-check em cada consumidor.
function isCompleteNeighborhood(
  n: NonNullable<NeighborhoodsQuery['neighborhoods']>[number],
): n is NeighborhoodOption {
  return Boolean(n.id && n.name && n.cityId && n.cityName && n.stateUf)
}

export function useNeighborhoods() {
  return useQuery({
    queryKey: ['neighborhoods'],
    queryFn: async () => {
      const result = await graphqlClient.request<
        NeighborhoodsQuery,
        NeighborhoodsQueryVariables
      >(NeighborhoodsDocument)
      return (result.neighborhoods ?? []).filter(isCompleteNeighborhood)
    },
    staleTime: Infinity, // catálogo quase estático (17 linhas hoje)
  })
}
