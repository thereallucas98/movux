'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  SubmitProposalDocument,
  type SubmitProposalMutation,
  type SubmitProposalMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_CALLED: 'Você precisa ser chamado na fila antes de enviar uma proposta.',
  ALREADY_PROPOSED: 'Você já enviou uma proposta para esse frete.',
  INVALID_STATE_TRANSITION: 'Esse frete não está mais aberto para propostas.',
  NOT_FOUND: 'Frete não encontrado.',
}

export function submitProposalErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível enviar a proposta. Tente novamente.'
  )
}

export function useSubmitProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: SubmitProposalMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          SubmitProposalMutation,
          SubmitProposalMutationVariables
        >(SubmitProposalDocument, variables)
        return result.submitProposal
      } catch (error) {
        throw new Error(submitProposalErrorMessage(error))
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['queue-entry', variables.shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['my-proposal', variables.shipmentId],
      })
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
    },
    meta: { successMessage: 'Proposta enviada com sucesso' },
  })
}
