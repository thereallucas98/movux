'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  CreateVehicleDocument,
  type CreateVehicleMutation,
  type CreateVehicleMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_SPEC: 'Especificação de veículo inválida — selecione uma da lista.',
  DUPLICATE_PLATE: 'Essa placa já está cadastrada.',
  VEHICLE_LIMIT_REACHED:
    'Você já tem 2 veículos ativos, o máximo permitido. Desative um pra cadastrar outro.',
}

export function createVehicleErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível cadastrar o veículo. Tente novamente.'
  )
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateVehicleMutationVariables['input']) => {
      try {
        const result = await graphqlClient.request<
          CreateVehicleMutation,
          CreateVehicleMutationVariables
        >(CreateVehicleDocument, { input })
        return result.createVehicle
      } catch (error) {
        throw new Error(createVehicleErrorMessage(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] })
    },
    meta: { successMessage: 'Veículo cadastrado com sucesso' },
  })
}
