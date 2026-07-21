'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ConfirmSafetyCheckInDocument,
  type ConfirmSafetyCheckInMutation,
  type ConfirmSafetyCheckInMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useConfirmSafetyCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const result = await graphqlClient.request<
        ConfirmSafetyCheckInMutation,
        ConfirmSafetyCheckInMutationVariables
      >(ConfirmSafetyCheckInDocument, { shipmentId })
      return result.confirmSafetyCheckIn
    },
    onSuccess: (_data, shipmentId) => {
      queryClient.invalidateQueries({
        queryKey: ['safety-check-in-status', shipmentId],
      })
    },
    meta: { successMessage: 'Check-in de segurança confirmado' },
  })
}
