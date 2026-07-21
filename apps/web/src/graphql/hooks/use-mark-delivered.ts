'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  MarkDeliveredDocument,
  type MarkDeliveredMutation,
  type MarkDeliveredMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useMarkDelivered() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const result = await graphqlClient.request<
        MarkDeliveredMutation,
        MarkDeliveredMutationVariables
      >(MarkDeliveredDocument, { shipmentId })
      return result.markDelivered
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-for-carrier', shipmentId] })
    },
    meta: { successMessage: 'Frete marcado como entregue' },
  })
}
