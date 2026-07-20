'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  WithdrawProposalDocument,
  type WithdrawProposalMutation,
  type WithdrawProposalMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_STATE_TRANSITION: 'Essa proposta não pode mais ser retirada.',
  NOT_FOUND: 'Proposta não encontrada.',
}

export function withdrawProposalErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível desistir da proposta. Tente novamente.'
  )
}

export function useWithdrawProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          WithdrawProposalMutation,
          WithdrawProposalMutationVariables
        >(WithdrawProposalDocument, { shipmentId })
        return result.withdrawProposal
      } catch (error) {
        throw new Error(withdrawProposalErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['queue-entry', shipmentId] })
      queryClient.invalidateQueries({
        queryKey: ['my-proposal', shipmentId],
      })
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
    },
    meta: { successMessage: 'Você desistiu da proposta' },
  })
}
