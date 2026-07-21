'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  PublishShipmentDocument,
  type PublishShipmentMutation,
  type PublishShipmentMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION: 'Esse frete já foi publicado.',
}

export function publishShipmentErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível publicar o frete. Tente novamente.'
  )
}

export function usePublishShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      try {
        const result = await graphqlClient.request<
          PublishShipmentMutation,
          PublishShipmentMutationVariables
        >(PublishShipmentDocument, { shipmentId })
        return result.publishShipment
      } catch (error) {
        throw new Error(publishShipmentErrorMessage(error))
      }
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipments', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['my-shipments'] })
    },
    meta: { successMessage: 'Frete publicado — transportadores já podem ver' },
  })
}
