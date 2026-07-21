'use client'

import { useQuery } from '@tanstack/react-query'

import {
  ShipmentCounterpartInfoDocument,
  type ShipmentCounterpartInfoQuery,
  type ShipmentCounterpartInfoQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useShipmentCounterpartInfo(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment-counterpart-info', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        ShipmentCounterpartInfoQuery,
        ShipmentCounterpartInfoQueryVariables
      >(ShipmentCounterpartInfoDocument, { shipmentId: shipmentId! })
      return result.shipmentCounterpartInfo ?? null
    },
    enabled: Boolean(shipmentId),
  })
}
