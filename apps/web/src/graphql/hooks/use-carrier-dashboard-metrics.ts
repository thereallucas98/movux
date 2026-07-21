'use client'

import { useQuery } from '@tanstack/react-query'

import {
  CarrierDashboardMetricsDocument,
  type CarrierDashboardMetricsQuery,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useCarrierDashboardMetrics() {
  return useQuery({
    queryKey: ['carrier-dashboard-metrics'],
    queryFn: async () => {
      const result = await graphqlClient.request<CarrierDashboardMetricsQuery>(
        CarrierDashboardMetricsDocument,
      )
      return result.carrierDashboardMetrics ?? null
    },
  })
}
