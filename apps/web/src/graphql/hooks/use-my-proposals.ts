'use client'

import { useQuery } from '@tanstack/react-query'

import {
  MyProposalsDocument,
  type MyProposalsQuery,
  type MyProposalsQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export interface UseMyProposalsFilter {
  cursor?: string
  limit?: number
}

export function useMyProposals(filter: UseMyProposalsFilter = {}) {
  return useQuery({
    queryKey: ['my-proposals', filter],
    queryFn: async () => {
      const result = await graphqlClient.request<
        MyProposalsQuery,
        MyProposalsQueryVariables
      >(MyProposalsDocument, filter)
      return result.myProposals ?? { data: [], nextCursor: null }
    },
    // my-proposals-list.tsx já trata isError com EmptyState próprio.
    meta: { silent: true },
  })
}
