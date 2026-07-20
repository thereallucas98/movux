'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  CreateShipmentDocument,
  type CreateShipmentMutation,
  type CreateShipmentMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  CUSTOMER_PROFILE_NOT_FOUND:
    'Seu perfil de cliente não foi encontrado. Fale com o suporte.',
  INVALID_ADDRESS: 'Endereço inválido — selecione um bairro da lista.',
  NO_PRICING_AVAILABLE:
    'Ainda não temos preço configurado para esse trajeto — tente outro bairro ou fale com o suporte.',
}

export function createShipmentErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível criar o frete. Tente novamente.'
  )
}

export function useCreateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateShipmentMutationVariables['input']) => {
      try {
        const result = await graphqlClient.request<
          CreateShipmentMutation,
          CreateShipmentMutationVariables
        >(CreateShipmentDocument, { input })
        return result.createShipment
      } catch (error) {
        throw new Error(createShipmentErrorMessage(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    meta: { successMessage: 'Frete criado com sucesso' },
  })
}
