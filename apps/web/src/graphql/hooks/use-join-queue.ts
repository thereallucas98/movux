'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  JoinProposalQueueDocument,
  type JoinProposalQueueMutation,
  type JoinProposalQueueMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_IN_QUEUE: 'Você já está na fila desse frete.',
  INVALID_STATE_TRANSITION: 'Esse frete não está mais aberto para propostas.',
  NOT_FOUND: 'Frete não encontrado.',
}

export function joinQueueErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível entrar na fila. Tente novamente.'
  )
}

export function useJoinQueue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          JoinProposalQueueMutation,
          JoinProposalQueueMutationVariables
        >(JoinProposalQueueDocument, { shipmentId })
        return result.joinProposalQueue
      } catch (error) {
        throw new Error(joinQueueErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['browse-shipments'] })
      queryClient.invalidateQueries({ queryKey: ['queue-entry', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
    },
    meta: { successMessage: 'Você entrou na fila desse frete' },
  })
}
