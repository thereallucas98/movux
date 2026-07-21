'use client'

import { useQuery } from '@tanstack/react-query'

import {
  ProposalsForShipmentDocument,
  type ProposalsForShipmentQuery,
  type ProposalsForShipmentQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useProposalsForShipment(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['proposals-for-shipment', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        ProposalsForShipmentQuery,
        ProposalsForShipmentQueryVariables
      >(ProposalsForShipmentDocument, { shipmentId: shipmentId! })
      return result.proposalsForShipment ?? []
    },
    enabled: Boolean(shipmentId),
  })
}
