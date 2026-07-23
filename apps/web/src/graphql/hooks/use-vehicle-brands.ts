'use client'

import { useQuery } from '@tanstack/react-query'

import {
  VehicleBrandsDocument,
  type VehicleBrandsQuery,
  type VehicleBrandsQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useVehicleBrands(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-brands', categoryId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        VehicleBrandsQuery,
        VehicleBrandsQueryVariables
      >(VehicleBrandsDocument, { categoryId: categoryId! })
      return result.vehicleBrands ?? []
    },
    enabled: Boolean(categoryId),
  })
}
