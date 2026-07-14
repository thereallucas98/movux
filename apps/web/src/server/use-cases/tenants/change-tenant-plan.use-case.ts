import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import {
  detectViolations,
  type QuotaViolation,
} from '~/server/plan-limits/detect-violations'
import {
  isDowngrade,
  isUpgrade,
  type PlanTier,
} from '~/server/plan-limits/plan-limits.config'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type {
  TenantRepository,
  TenantRow,
} from '~/server/repositories/tenant.repository'
import type { Principal } from './create-tenant.use-case'

const GRACE_PERIOD_DAYS = 14

export interface ChangeTenantPlanInput {
  tenantId: string
  plan: PlanTier
}

export interface ChangeTenantPlanData {
  tenant: TenantRow
  previousPlan: PlanTier
  gracePeriodUntil: Date | null
  violations: QuotaViolation[]
}

export type ChangeTenantPlanResult =
  | { success: true; data: ChangeTenantPlanData }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function changeTenantPlan(
  tenantRepo: TenantRepository,
  tenantMembershipRepo: TenantMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ChangeTenantPlanInput,
  options?: { now?: Date },
): Promise<ChangeTenantPlanResult> {
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

  const previousPlan = tenant.plan
  const newPlan = input.plan
  const now = options?.now ?? new Date()

  // Idempotent: same-plan call is a no-op.
  if (previousPlan === newPlan) {
    return {
      success: true,
      data: {
        tenant,
        previousPlan,
        gracePeriodUntil: tenant.gracePeriodUntil,
        violations: [],
      },
    }
  }

  let nextGracePeriod: Date | null = tenant.gracePeriodUntil
  let violations: QuotaViolation[] = []

  if (isDowngrade(previousPlan, newPlan)) {
    violations = await detectViolations(
      { db: prisma },
      {
        tenantId: tenant.id,
        targetPlan: newPlan,
        timezone: tenant.timezone,
        now,
      },
    )
    if (violations.length > 0 && tenant.gracePeriodUntil === null) {
      // Start a fresh 14-day grace window
      nextGracePeriod = addDays(now, GRACE_PERIOD_DAYS)
    }
    // If grace already active and there are still violations, preserve the
    // existing clock — do NOT reset (research §7.4).
    if (violations.length === 0) {
      // Downgrade with no violations — clear any stale grace
      nextGracePeriod = null
    }
  } else if (isUpgrade(previousPlan, newPlan)) {
    // Upgrade clears any stale grace state (research §7.1)
    nextGracePeriod = null
  }

  const updated = await prisma.$transaction(async (tx) => {
    const refreshed = await tenantRepo.updatePlan(
      tenant.id,
      newPlan,
      nextGracePeriod,
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'TENANT_PLAN_CHANGED',
        entityType: 'TENANT',
        entityId: tenant.id,
        metadata: {
          from: previousPlan,
          to: newPlan,
          gracePeriodUntil: nextGracePeriod
            ? nextGracePeriod.toISOString()
            : null,
          violations,
        },
      },
      tx,
    )
    return refreshed
  })

  return {
    success: true,
    data: {
      tenant: updated,
      previousPlan,
      gracePeriodUntil: nextGracePeriod,
      violations,
    },
  }
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}
