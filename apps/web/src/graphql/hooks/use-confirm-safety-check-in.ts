'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ConfirmSafetyCheckInDocument,
  type ConfirmSafetyCheckInMutation,
  type ConfirmSafetyCheckInMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION:
    'O check-in de segurança só pode ser feito depois que um transportador é selecionado.',
  ALREADY_CONFIRMED: 'Você já confirmou o check-in desse frete.',
}

export function confirmSafetyCheckInErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível confirmar o check-in. Tente novamente.'
  )
}

export function useConfirmSafetyCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          ConfirmSafetyCheckInMutation,
          ConfirmSafetyCheckInMutationVariables
        >(ConfirmSafetyCheckInDocument, { shipmentId })
        return result.confirmSafetyCheckIn
      } catch (error) {
        throw new Error(confirmSafetyCheckInErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({
        queryKey: ['safety-check-in-status', shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipment-counterpart-info', shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipment-events', shipmentId],
      })
    },
    meta: { successMessage: 'Check-in de segurança confirmado' },
  })
}
