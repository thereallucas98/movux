'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ConfirmDeliveryDocument,
  type ConfirmDeliveryMutation,
  type ConfirmDeliveryMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useConfirmDelivery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: ConfirmDeliveryMutationVariables) => {
      const result = await graphqlClient.request<
        ConfirmDeliveryMutation,
        ConfirmDeliveryMutationVariables
      >(ConfirmDeliveryDocument, variables)
      return result.confirmDelivery
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['delivery-confirmation-status', variables.shipmentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['shipments', variables.shipmentId],
      })
    },
    meta: { successMessage: 'Entrega confirmada' },
  })
}
