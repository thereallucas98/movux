'use client'

import { useQuery } from '@tanstack/react-query'

import {
  VehicleCategoriesDocument,
  type VehicleCategoriesQuery,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useVehicleTaxonomy() {
  return useQuery({
    queryKey: ['vehicle-categories'],
    queryFn: async () => {
      const result = await graphqlClient.request<VehicleCategoriesQuery>(
        VehicleCategoriesDocument,
      )
      return result.vehicleCategories ?? []
    },
  })
}
