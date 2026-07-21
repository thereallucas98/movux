'use client'

import { useQuery } from '@tanstack/react-query'

import {
  ReviewsForShipmentDocument,
  type ReviewsForShipmentQuery,
  type ReviewsForShipmentQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useReviewsForShipment(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['reviews-for-shipment', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        ReviewsForShipmentQuery,
        ReviewsForShipmentQueryVariables
      >(ReviewsForShipmentDocument, { shipmentId: shipmentId! })
      return result.reviewsForShipment ?? []
    },
    enabled: Boolean(shipmentId),
  })
}
