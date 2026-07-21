'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  RejectProposalDocument,
  type RejectProposalMutation,
  type RejectProposalMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Proposta ou frete não encontrado.',
  INVALID_STATE_TRANSITION: 'Esse frete não está mais aberto para propostas.',
}

export function rejectProposalErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível recusar a proposta. Tente novamente.'
  )
}

export function useRejectProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: RejectProposalMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          RejectProposalMutation,
          RejectProposalMutationVariables
        >(RejectProposalDocument, variables)
        return result.rejectProposal
      } catch (error) {
        throw new Error(rejectProposalErrorMessage(error))
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['proposals-for-shipment', variables.shipmentId],
      })
    },
    meta: { successMessage: 'Proposta recusada' },
  })
}
