'use client'

import { useQuery } from '@tanstack/react-query'

import {
  CustomerDashboardMetricsDocument,
  type CustomerDashboardMetricsQuery,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useCustomerDashboardMetrics() {
  return useQuery({
    queryKey: ['customer-dashboard-metrics'],
    queryFn: async () => {
      const result = await graphqlClient.request<CustomerDashboardMetricsQuery>(
        CustomerDashboardMetricsDocument,
      )
      return result.customerDashboardMetrics ?? null
    },
  })
}
