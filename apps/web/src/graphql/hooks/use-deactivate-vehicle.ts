'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  DeactivateVehicleDocument,
  type DeactivateVehicleMutation,
  type DeactivateVehicleMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Veículo não encontrado.',
  FORBIDDEN: 'Esse veículo não é seu.',
}

export function deactivateVehicleErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível desativar o veículo. Tente novamente.'
  )
}

export function useDeactivateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      try {
        const result = await graphqlClient.request<
          DeactivateVehicleMutation,
          DeactivateVehicleMutationVariables
        >(DeactivateVehicleDocument, { vehicleId })
        return result.deactivateVehicle
      } catch (error) {
        throw new Error(deactivateVehicleErrorMessage(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] })
    },
    meta: { successMessage: 'Veículo desativado' },
  })
}
