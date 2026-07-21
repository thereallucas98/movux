'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  MarkCollectedDocument,
  type MarkCollectedMutation,
  type MarkCollectedMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useMarkCollected() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const result = await graphqlClient.request<
        MarkCollectedMutation,
        MarkCollectedMutationVariables
      >(MarkCollectedDocument, { shipmentId })
      return result.markCollected
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-for-carrier', shipmentId] })
    },
    meta: { successMessage: 'Frete marcado como coletado' },
  })
}
