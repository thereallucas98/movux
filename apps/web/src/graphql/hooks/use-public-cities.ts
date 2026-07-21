'use client'

import { useQuery } from '@tanstack/react-query'

import {
  PublicCitiesDocument,
  type PublicCitiesQuery,
  type PublicCitiesQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export interface CityOption {
  id: string
  name: string
  stateUf: string
}

function isCompleteCity(
  c: NonNullable<PublicCitiesQuery['publicCities']>[number],
): c is CityOption {
  return Boolean(c.id && c.name && c.stateUf)
}

export function usePublicCities() {
  return useQuery({
    queryKey: ['public-cities'],
    queryFn: async () => {
      const result = await graphqlClient.request<
        PublicCitiesQuery,
        PublicCitiesQueryVariables
      >(PublicCitiesDocument)
      return (result.publicCities ?? []).filter(isCompleteCity)
    },
    staleTime: Infinity,
  })
}
