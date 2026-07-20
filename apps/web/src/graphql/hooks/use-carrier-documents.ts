'use client'

import { useQuery } from '@tanstack/react-query'

import {
  CarrierDocumentsDocument,
  type CarrierDocumentsQuery,
  type CarrierDocumentsQueryVariables,
  type VerificationStatus,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export interface UseCarrierDocumentsFilter {
  status?: VerificationStatus
  cursor?: string
  limit?: number
}

export function useCarrierDocuments(filter: UseCarrierDocumentsFilter = {}) {
  return useQuery({
    queryKey: ['carrier-documents', filter],
    queryFn: async () => {
      const result = await graphqlClient.request<
        CarrierDocumentsQuery,
        CarrierDocumentsQueryVariables
      >(CarrierDocumentsDocument, filter)
      return result.carrierDocuments ?? { data: [], nextCursor: null }
    },
  })
}
