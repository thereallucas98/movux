'use client'

import { useQuery } from '@tanstack/react-query'

import {
  SafetyCheckInStatusDocument,
  type SafetyCheckInStatusQuery,
  type SafetyCheckInStatusQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useSafetyCheckInStatus(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['safety-check-in-status', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        SafetyCheckInStatusQuery,
        SafetyCheckInStatusQueryVariables
      >(SafetyCheckInStatusDocument, { shipmentId: shipmentId! })
      return result.safetyCheckInStatus ?? null
    },
    enabled: Boolean(shipmentId),
  })
}
