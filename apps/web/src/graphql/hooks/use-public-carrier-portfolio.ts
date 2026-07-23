'use client'

import { useQuery } from '@tanstack/react-query'

import {
  PublicCarrierPortfolioDocument,
  type PublicCarrierPortfolioQuery,
  type PublicCarrierPortfolioQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function usePublicCarrierPortfolio(userId: string) {
  return useQuery({
    queryKey: ['public-carrier-portfolio', userId],
    queryFn: async () => {
      const result = await graphqlClient.request<
        PublicCarrierPortfolioQuery,
        PublicCarrierPortfolioQueryVariables
      >(PublicCarrierPortfolioDocument, { userId })
      return result.publicCarrierPortfolio ?? null
    },
  })
}
