'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  RejectProposalDocument,
  type RejectProposalMutation,
  type RejectProposalMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useRejectProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: RejectProposalMutationVariables) => {
      const result = await graphqlClient.request<
        RejectProposalMutation,
        RejectProposalMutationVariables
      >(RejectProposalDocument, variables)
      return result.rejectProposal
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['proposals-for-shipment', variables.shipmentId],
      })
    },
    meta: { successMessage: 'Proposta recusada' },
  })
}
