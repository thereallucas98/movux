'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  RecordExternalValidationDocument,
  type RecordExternalValidationMutation,
  type RecordExternalValidationMutationVariables,
} from '~/graphql/generated/types'
import { getGraphQLErrorCode, graphqlClient } from '~/lib/graphql-client'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Documento não encontrado.',
}

export function recordExternalValidationErrorMessage(error: unknown): string {
  const code = getGraphQLErrorCode(error)
  return (
    (code && ERROR_MESSAGES[code]) ||
    'Não foi possível registrar a checagem. Tente novamente.'
  )
}

export function useRecordExternalValidation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      variables: RecordExternalValidationMutationVariables,
    ) => {
      try {
        const result = await graphqlClient.request<
          RecordExternalValidationMutation,
          RecordExternalValidationMutationVariables
        >(RecordExternalValidationDocument, variables)
        return result.recordExternalValidation
      } catch (error) {
        throw new Error(recordExternalValidationErrorMessage(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-documents'] })
    },
    meta: { successMessage: 'Checagem registrada' },
  })
}
