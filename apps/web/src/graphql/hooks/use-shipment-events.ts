'use client'

import { useQuery } from '@tanstack/react-query'

import {
  ShipmentEventsDocument,
  type ShipmentEventsQuery,
  type ShipmentEventsQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useShipmentEvents(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment-events', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        ShipmentEventsQuery,
        ShipmentEventsQueryVariables
      >(ShipmentEventsDocument, { shipmentId: shipmentId! })
      return result.shipmentEvents ?? []
    },
    enabled: Boolean(shipmentId),
  })
}
