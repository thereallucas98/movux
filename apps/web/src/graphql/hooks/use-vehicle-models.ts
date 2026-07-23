'use client'

import { useQuery } from '@tanstack/react-query'

import {
  VehicleModelsDocument,
  type VehicleModelsQuery,
  type VehicleModelsQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useVehicleModels(brandId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-models', brandId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        VehicleModelsQuery,
        VehicleModelsQueryVariables
      >(VehicleModelsDocument, { brandId: brandId! })
      return result.vehicleModels ?? []
    },
    enabled: Boolean(brandId),
  })
}
