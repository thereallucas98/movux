'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  AcceptProposalDocument,
  type AcceptProposalMutation,
  type AcceptProposalMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useAcceptProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: AcceptProposalMutationVariables) => {
      const result = await graphqlClient.request<
        AcceptProposalMutation,
        AcceptProposalMutationVariables
      >(AcceptProposalDocument, variables)
      return result.acceptProposal
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shipments', variables.shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['proposals-for-shipment', variables.shipmentId],
      })
    },
    meta: { successMessage: 'Proposta aceita' },
  })
}
