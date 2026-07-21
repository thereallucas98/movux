'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  MarkInTransitDocument,
  type MarkInTransitMutation,
  type MarkInTransitMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useMarkInTransit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const result = await graphqlClient.request<
        MarkInTransitMutation,
        MarkInTransitMutationVariables
      >(MarkInTransitDocument, { shipmentId })
      return result.markInTransit
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-for-carrier', shipmentId] })
    },
    meta: { successMessage: 'Frete marcado como em trânsito' },
  })
}
