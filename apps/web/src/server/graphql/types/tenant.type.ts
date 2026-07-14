import { builder } from '../builder'
import { PlanTierEnum } from '../enums/plan-tier.enum'

export const TenantType = builder.simpleObject('Tenant', {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    timezone: t.string(),
    plan: t.field({ type: PlanTierEnum }),
    gracePeriodUntil: t.field({ type: 'DateTime', nullable: true }),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

export const QuotaViolationType = builder.simpleObject('QuotaViolation', {
  fields: (t) => ({
    resource: t.string(),
    workspaceId: t.id({ nullable: true }),
    current: t.int(),
    newLimit: t.int({ nullable: true }),
  }),
})

export const TenantPlanChangeResultType = builder.simpleObject(
  'TenantPlanChangeResult',
  {
    fields: (t) => ({
      tenant: t.field({ type: TenantType }),
      previousPlan: t.field({ type: PlanTierEnum }),
      gracePeriodUntil: t.field({ type: 'DateTime', nullable: true }),
      violations: t.field({ type: [QuotaViolationType] }),
    }),
  },
)
