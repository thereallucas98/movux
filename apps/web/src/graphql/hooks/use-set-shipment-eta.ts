'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  SetShipmentEtaDocument,
  type SetShipmentEtaMutation,
  type SetShipmentEtaMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION:
    'Esse ETA não pode ser atualizado nesta etapa do frete.',
}

export function setShipmentEtaErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível atualizar o horário previsto. Tente novamente.'
  )
}

export function useSetShipmentEta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: SetShipmentEtaMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          SetShipmentEtaMutation,
          SetShipmentEtaMutationVariables
        >(SetShipmentEtaDocument, variables)
        return result.setShipmentEta
      } catch (error) {
        throw new Error(setShipmentEtaErrorMessage(error))
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shipment-for-carrier', variables.shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipments', variables.shipmentId],
      })
    },
    meta: { successMessage: 'Horário previsto atualizado' },
  })
}
