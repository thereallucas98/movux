'use client'

import { useQuery } from '@tanstack/react-query'

import {
  AdminDashboardMetricsDocument,
  type AdminDashboardMetricsQuery,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useAdminDashboardMetrics() {
  return useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const result = await graphqlClient.request<AdminDashboardMetricsQuery>(
        AdminDashboardMetricsDocument,
      )
      return result.adminDashboardMetrics ?? null
    },
  })
}
