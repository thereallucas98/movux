'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  WithdrawFromQueueDocument,
  type WithdrawFromQueueMutation,
  type WithdrawFromQueueMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_STATE_TRANSITION: 'Não é possível sair da fila nesse estado.',
  NOT_FOUND: 'Você não está na fila desse frete.',
}

export function withdrawQueueErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível sair da fila. Tente novamente.'
  )
}

export function useWithdrawQueue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          WithdrawFromQueueMutation,
          WithdrawFromQueueMutationVariables
        >(WithdrawFromQueueDocument, { shipmentId })
        return result.withdrawFromQueue
      } catch (error) {
        throw new Error(withdrawQueueErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['browse-shipments'] })
      queryClient.invalidateQueries({ queryKey: ['queue-entry', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
    },
    meta: { successMessage: 'Você saiu da fila desse frete' },
  })
}
