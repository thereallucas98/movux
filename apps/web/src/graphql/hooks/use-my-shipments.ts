'use client'

import { useQuery } from '@tanstack/react-query'

import {
  MyShipmentsDocument,
  type MyShipmentsQuery,
  type MyShipmentsQueryVariables,
  type ShipmentStatus,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export interface UseMyShipmentsFilter {
  status?: ShipmentStatus
  cursor?: string
  limit?: number
}

export function useMyShipments(filter: UseMyShipmentsFilter = {}) {
  return useQuery({
    queryKey: ['shipments', filter],
    queryFn: async () => {
      const result = await graphqlClient.request<
        MyShipmentsQuery,
        MyShipmentsQueryVariables
      >(MyShipmentsDocument, filter)
      return result.myShipments ?? { data: [], nextCursor: null }
    },
  })
}
