'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  MarkDeliveredDocument,
  type MarkDeliveredMutation,
  type MarkDeliveredMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION:
    'Esse frete precisa estar em trânsito antes de ser entregue.',
}

export function markDeliveredErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível marcar como entregue. Tente novamente.'
  )
}

export function useMarkDelivered() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          MarkDeliveredMutation,
          MarkDeliveredMutationVariables
        >(MarkDeliveredDocument, { shipmentId })
        return result.markDelivered
      } catch (error) {
        throw new Error(markDeliveredErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({
        queryKey: ['shipment-for-carrier', shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipment-counterpart-info', shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipment-events', shipmentId],
      })
    },
    meta: { successMessage: 'Frete marcado como entregue' },
  })
}
