import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import {
  PLAN_LIMITS,
  type PlanTier,
} from '~/server/plan-limits/plan-limits.config'
import {
  countWorkspaces,
  type CountersDeps,
} from '~/server/plan-limits/usage-counters'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type { TenantRepository } from '~/server/repositories/tenant.repository'
import type { Principal } from './create-tenant.use-case'

export interface PlanLimitResource {
  limit: number | null
  current: number
  percent: number | null
  exhausted: boolean
}

export interface TenantPlanLimitsData {
  tenantId: string
  plan: PlanTier
  gracePeriodUntil: Date | null
  resources: {
    workspaces: PlanLimitResource
    tenantScopedCatalogs: { allowed: boolean }
  }
}

export type GetTenantPlanLimitsResult =
  | { success: true; data: TenantPlanLimitsData }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function getTenantPlanLimits(
  tenantRepo: TenantRepository,
  tenantMembershipRepo: TenantMembershipRepository,
  principal: Principal | null,
  input: { tenantId: string },
  deps?: CountersDeps,
): Promise<GetTenantPlanLimitsResult> {
  const auth = await assertSuperAdminOfTenant(
    tenantMembershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const tenant = await tenantRepo.findById(input.tenantId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }

  const counterDeps = deps ?? { db: prisma }
  const limits = PLAN_LIMITS[tenant.plan]
  const workspacesCurrent = await countWorkspaces(counterDeps, {
    tenantId: tenant.id,
  })

  return {
    success: true,
    data: {
      tenantId: tenant.id,
      plan: tenant.plan,
      gracePeriodUntil: tenant.gracePeriodUntil,
      resources: {
        workspaces: makeResource(limits.workspacesPerTenant, workspacesCurrent),
        tenantScopedCatalogs: { allowed: limits.tenantScopedCatalogs },
      },
    },
  }
}

function makeResource(
  limit: number | null,
  current: number,
): PlanLimitResource {
  if (limit === null) {
    return { limit: null, current, percent: null, exhausted: false }
  }
  const percent = Math.floor((current / limit) * 100)
  return { limit, current, percent, exhausted: current >= limit }
}
