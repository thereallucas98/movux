'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  AcceptProposalDocument,
  type AcceptProposalMutation,
  type AcceptProposalMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Proposta ou frete não encontrado.',
  INVALID_STATE_TRANSITION: 'Esse frete não está mais aberto para propostas.',
}

export function acceptProposalErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível aceitar a proposta. Tente novamente.'
  )
}

export function useAcceptProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: AcceptProposalMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          AcceptProposalMutation,
          AcceptProposalMutationVariables
        >(AcceptProposalDocument, variables)
        return result.acceptProposal
      } catch (error) {
        throw new Error(acceptProposalErrorMessage(error))
      }
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
