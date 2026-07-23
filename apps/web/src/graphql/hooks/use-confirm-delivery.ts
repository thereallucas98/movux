'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ConfirmDeliveryDocument,
  type ConfirmDeliveryMutation,
  type ConfirmDeliveryMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION: 'Esse frete ainda não foi marcado como entregue.',
  ALREADY_CONFIRMED: 'A entrega desse frete já foi confirmada.',
}

export function confirmDeliveryErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível confirmar a entrega. Tente novamente.'
  )
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: ConfirmDeliveryMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          ConfirmDeliveryMutation,
          ConfirmDeliveryMutationVariables
        >(ConfirmDeliveryDocument, variables)
        return result.confirmDelivery
      } catch (error) {
        throw new Error(confirmDeliveryErrorMessage(error))
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['delivery-confirmation-status', variables.shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipments', variables.shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipment-counterpart-info', variables.shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipment-events', variables.shipmentId],
      })
    },
    meta: {
      successMessage: (
        _data: unknown,
        variables: ConfirmDeliveryMutationVariables,
      ) =>
        variables.input.issueDescription
          ? 'Problema reportado'
          : 'Entrega confirmada',
    },
  })
}
