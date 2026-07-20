'use client'

import { useQuery } from '@tanstack/react-query'

import {
  BrowseShipmentsDocument,
  type BrowseShipmentsQuery,
  type BrowseShipmentsQueryVariables,
  type ShipmentType,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export interface UseBrowseShipmentsFilter {
  cityId?: string
  type?: ShipmentType
  cursor?: string
  limit?: number
}

export function useBrowseShipments(filter: UseBrowseShipmentsFilter = {}) {
  return useQuery({
    queryKey: ['browse-shipments', filter],
    queryFn: async () => {
      const result = await graphqlClient.request<
        BrowseShipmentsQuery,
        BrowseShipmentsQueryVariables
      >(BrowseShipmentsDocument, filter)
      return result.browseShipments ?? { data: [], nextCursor: null }
    },
  })
}
