'use client'

import { useQuery } from '@tanstack/react-query'

import {
  PublicCarrierSearchDocument,
  type PublicCarrierSearchQuery,
  type PublicCarrierSearchQueryVariables,
  type VehicleType,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export interface UsePublicCarrierSearchFilter {
  cityId: string
  vehicleType?: VehicleType
}

export function usePublicCarrierSearch(filter: UsePublicCarrierSearchFilter | null) {
  return useQuery({
    queryKey: ['public-carrier-search', filter],
    queryFn: async () => {
      if (!filter) return []
      const result = await graphqlClient.request<
        PublicCarrierSearchQuery,
        PublicCarrierSearchQueryVariables
      >(PublicCarrierSearchDocument, filter)
      return result.publicCarrierSearch ?? []
    },
    enabled: !!filter,
  })
}
