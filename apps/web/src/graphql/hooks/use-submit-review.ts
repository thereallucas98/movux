'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  SubmitReviewDocument,
  type SubmitReviewMutation,
  type SubmitReviewMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Frete não encontrado.',
  INVALID_STATE_TRANSITION: 'Esse frete ainda não pode ser avaliado.',
  ALREADY_REVIEWED: 'Você já avaliou esse frete.',
  VALIDATION_ERROR: 'Nota inválida — escolha de 1 a 5 estrelas.',
}

export function submitReviewErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível enviar a avaliação. Tente novamente.'
  )
}

export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: SubmitReviewMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          SubmitReviewMutation,
          SubmitReviewMutationVariables
        >(SubmitReviewDocument, variables)
        return result.submitReview
      } catch (error) {
        throw new Error(submitReviewErrorMessage(error))
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reviews-for-shipment', variables.shipmentId],
      })
    },
    meta: { successMessage: 'Avaliação enviada' },
  })
}
