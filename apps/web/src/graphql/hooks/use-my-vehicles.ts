'use client'

import { useQuery } from '@tanstack/react-query'

import {
  MyVehiclesDocument,
  type MyVehiclesQuery,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useMyVehicles() {
  return useQuery({
    queryKey: ['my-vehicles'],
    queryFn: async () => {
      const result =
        await graphqlClient.request<MyVehiclesQuery>(MyVehiclesDocument)
      return result.myVehicles ?? []
    },
    // vehicle-list.tsx trata isError com EmptyState próprio.
    meta: { silent: true },
  })
}
