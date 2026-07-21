'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  SubmitReviewDocument,
  type SubmitReviewMutation,
  type SubmitReviewMutationVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: SubmitReviewMutationVariables) => {
      const result = await graphqlClient.request<
        SubmitReviewMutation,
        SubmitReviewMutationVariables
      >(SubmitReviewDocument, variables)
      return result.submitReview
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reviews-for-shipment', variables.shipmentId],
      })
    },
    meta: { successMessage: 'Avaliação enviada' },
  })
}
