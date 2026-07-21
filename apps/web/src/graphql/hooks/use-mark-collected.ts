'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  MarkCollectedDocument,
  type MarkCollectedMutation,
  type MarkCollectedMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION: 'Esse frete não está pronto pra ser coletado.',
  SAFETY_NOT_CONFIRMED:
    'O check-in de segurança dos dois lados precisa ser confirmado antes da coleta.',
}

export function markCollectedErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível marcar como coletado. Tente novamente.'
  )
}

export function useMarkCollected() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          MarkCollectedMutation,
          MarkCollectedMutationVariables
        >(MarkCollectedDocument, { shipmentId })
        return result.markCollected
      } catch (error) {
        throw new Error(markCollectedErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-for-carrier', shipmentId] })
    },
    meta: { successMessage: 'Frete marcado como coletado' },
  })
}
