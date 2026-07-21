'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  PublishShipmentDocument,
  type PublishShipmentMutation,
  type PublishShipmentMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function usePublishShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const result = await graphqlClient.request<
        PublishShipmentMutation,
        PublishShipmentMutationVariables
      >(PublishShipmentDocument, { shipmentId })
      return result.publishShipment
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipments', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['my-shipments'] })
    },
    meta: { successMessage: 'Frete publicado — transportadores já podem ver' },
  })
}
