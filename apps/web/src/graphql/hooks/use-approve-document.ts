'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ApproveCarrierDocumentDocument,
  type ApproveCarrierDocumentMutation,
  type ApproveCarrierDocumentMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_STATE_TRANSITION: 'Esse documento já foi revisado.',
  NOT_FOUND: 'Documento não encontrado.',
}

export function approveDocumentErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível aprovar o documento. Tente novamente.'
  )
}

export function useApproveDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      try {
        const result = await graphqlClient.request<
          ApproveCarrierDocumentMutation,
          ApproveCarrierDocumentMutationVariables
        >(ApproveCarrierDocumentDocument, { documentId })
        return result.approveCarrierDocument
      } catch (error) {
        throw new Error(approveDocumentErrorMessage(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-documents'] })
    },
    meta: { successMessage: 'Documento aprovado' },
  })
}
