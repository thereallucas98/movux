'use client'

import { useQuery } from '@tanstack/react-query'

import {
  DeliveryConfirmationStatusDocument,
  type DeliveryConfirmationStatusQuery,
  type DeliveryConfirmationStatusQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useDeliveryConfirmationStatus(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['delivery-confirmation-status', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        DeliveryConfirmationStatusQuery,
        DeliveryConfirmationStatusQueryVariables
      >(DeliveryConfirmationStatusDocument, { shipmentId: shipmentId! })
      return result.deliveryConfirmationStatus ?? null
    },
    enabled: Boolean(shipmentId),
  })
}
