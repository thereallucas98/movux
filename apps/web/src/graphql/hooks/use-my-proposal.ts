'use client'

import { useQuery } from '@tanstack/react-query'

import {
  MyProposalDocument,
  type MyProposalQuery,
  type MyProposalQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useMyProposal(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['my-proposal', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        MyProposalQuery,
        MyProposalQueryVariables
      >(MyProposalDocument, { shipmentId: shipmentId! })
      return result.myProposal ?? null
    },
    enabled: Boolean(shipmentId),
  })
}
