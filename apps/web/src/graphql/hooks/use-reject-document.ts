'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  RejectCarrierDocumentDocument,
  type RejectCarrierDocumentMutation,
  type RejectCarrierDocumentMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_STATE_TRANSITION: 'Esse documento já foi revisado.',
  NOT_FOUND: 'Documento não encontrado.',
}

export function rejectDocumentErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível rejeitar o documento. Tente novamente.'
  )
}

export function useRejectDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: RejectCarrierDocumentMutationVariables) => {
      try {
        const result = await graphqlClient.request<
          RejectCarrierDocumentMutation,
          RejectCarrierDocumentMutationVariables
        >(RejectCarrierDocumentDocument, variables)
        return result.rejectCarrierDocument
      } catch (error) {
        throw new Error(rejectDocumentErrorMessage(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-documents'] })
    },
    meta: { successMessage: 'Documento rejeitado' },
  })
}
