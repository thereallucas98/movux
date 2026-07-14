'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'
import type { TenantPlanLimitsData } from '~/server/use-cases/tenants/get-tenant-plan-limits.use-case'

async function fetchTenantPlanLimits(
  tenantId: string,
): Promise<TenantPlanLimitsData> {
  const res = await fetch(`/api/tenants/${tenantId}/plan-limits`, {
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<TenantPlanLimitsData>
}

export function useTenantPlanLimits(tenantId: string | null) {
  return useQuery({
    queryKey: ['plan-limits', 'tenant', tenantId] as const,
    queryFn: () => fetchTenantPlanLimits(tenantId!),
    enabled: !!tenantId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    meta: { silent: true },
  })
}
