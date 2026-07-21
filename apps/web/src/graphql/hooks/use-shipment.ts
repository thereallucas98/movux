'use client'

import { useQuery } from '@tanstack/react-query'

import {
  ShipmentDocument,
  type ShipmentQuery,
  type ShipmentQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useShipment(id: string) {
  return useQuery({
    queryKey: ['shipments', id],
    queryFn: async () => {
      const result = await graphqlClient.request<
        ShipmentQuery,
        ShipmentQueryVariables
      >(ShipmentDocument, { id })
      return result.shipment ?? null
    },
    enabled: Boolean(id),
    // ShipmentDetailView já trata erro/not-found com EmptyState próprio —
    // sem isso, o toast global (QueryProvider) vaza a query GraphQL crua.
    meta: { silent: true },
  })
}
