'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  AddProposalAttemptDocument,
  type AddProposalAttemptMutation,
  type AddProposalAttemptMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  TOO_MANY_ATTEMPTS: 'Você já usou as 5 tentativas de proposta permitidas.',
  INVALID_STATE_TRANSITION: 'Essa proposta não pode mais ser renegociada.',
  NOT_FOUND: 'Proposta não encontrada.',
  ATTEMPT_STILL_PENDING:
    'Aguarde o cliente responder sua proposta atual antes de enviar outra.',
}

export function addProposalAttemptErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível enviar a contra-oferta. Tente novamente.'
  )
}

export function useAddProposalAttempt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: AddProposalAttemptMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          AddProposalAttemptMutation,
          AddProposalAttemptMutationVariables
        >(AddProposalAttemptDocument, variables)
        return result.addProposalAttempt
      } catch (error) {
        throw new Error(addProposalAttemptErrorMessage(error))
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['my-proposal', variables.shipmentId],
      })
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
    },
    meta: { successMessage: 'Contra-oferta enviada com sucesso' },
  })
}
