'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  MarkInTransitDocument,
  type MarkInTransitMutation,
  type MarkInTransitMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION: 'Esse frete precisa estar coletado antes de seguir em trânsito.',
}

export function markInTransitErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível marcar como em trânsito. Tente novamente.'
  )
}

export function useMarkInTransit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          MarkInTransitMutation,
          MarkInTransitMutationVariables
        >(MarkInTransitDocument, { shipmentId })
        return result.markInTransit
      } catch (error) {
        throw new Error(markInTransitErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-for-carrier', shipmentId] })
    },
    meta: { successMessage: 'Frete marcado como em trânsito' },
  })
}
