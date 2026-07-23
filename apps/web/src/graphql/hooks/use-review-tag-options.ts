'use client'

import { useQuery } from '@tanstack/react-query'

import {
  ReviewTagOptionsDocument,
  type ReviewerRole,
  type ReviewTagOptionsQuery,
  type ReviewTagOptionsQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useReviewTagOptions(targetRole: ReviewerRole) {
  return useQuery({
    queryKey: ['review-tag-options', targetRole],
    queryFn: async () => {
      const result = await graphqlClient.request<
        ReviewTagOptionsQuery,
        ReviewTagOptionsQueryVariables
      >(ReviewTagOptionsDocument, { targetRole })
      return result.reviewTagOptions ?? []
    },
  })
}
