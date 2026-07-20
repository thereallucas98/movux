'use client'

import { useQuery } from '@tanstack/react-query'

import {
  MyQueueEntryDocument,
  type MyQueueEntryQuery,
  type MyQueueEntryQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useQueueEntry(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['queue-entry', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        MyQueueEntryQuery,
        MyQueueEntryQueryVariables
      >(MyQueueEntryDocument, { shipmentId: shipmentId! })
      return result.myQueueEntry ?? null
    },
    enabled: Boolean(shipmentId),
  })
}
