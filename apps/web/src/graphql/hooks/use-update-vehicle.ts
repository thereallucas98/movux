'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  UpdateVehicleDocument,
  type UpdateVehicleMutation,
  type UpdateVehicleMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Veículo não encontrado.',
  FORBIDDEN: 'Esse veículo não é seu.',
  INVALID_SPEC: 'Especificação de veículo inválida — selecione uma da lista.',
  DUPLICATE_PLATE: 'Essa placa já está cadastrada.',
}

export function updateVehicleErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível atualizar o veículo. Tente novamente.'
  )
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: UpdateVehicleMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          UpdateVehicleMutation,
          UpdateVehicleMutationVariables
        >(UpdateVehicleDocument, variables)
        return result.updateVehicle
      } catch (error) {
        throw new Error(updateVehicleErrorMessage(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] })
    },
    meta: { successMessage: 'Veículo atualizado com sucesso' },
  })
}
