'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'
import type { PlanTier } from '~/server/plan-limits/plan-limits.config'
import type { TenantRow } from '~/server/repositories/tenant.repository'
import type { QuotaViolation } from '~/server/plan-limits/detect-violations'

export interface ChangeTenantPlanInput {
  tenantId: string
  plan: PlanTier
}

export interface ChangeTenantPlanResponse {
  tenantId: string
  plan: PlanTier
  previousPlan: PlanTier
  gracePeriodUntil: string | null
  violations: QuotaViolation[]
  tenant?: TenantRow
}

async function patchTenantPlan(
  input: ChangeTenantPlanInput,
): Promise<ChangeTenantPlanResponse> {
  const res = await fetch(`/api/tenants/${input.tenantId}/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ plan: input.plan }),
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<ChangeTenantPlanResponse>
}

export function useChangeTenantPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: patchTenantPlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['plan-limits', 'tenant', data.tenantId],
      })
      queryClient.invalidateQueries({
        queryKey: ['plan-limits', 'workspace'],
      })
      if (data.violations.length === 0) {
        toast.success(`Plano alterado para ${data.plan}`)
      }
      // If violations > 0, the consumer opens the DowngradeConfirmDialog
      // and surfaces its own UI; we don't toast there.
    },
    meta: { silent: true },
  })
}
