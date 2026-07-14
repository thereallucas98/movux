import { builder } from '../builder'
import { PlanTierEnum } from '../enums/plan-tier.enum'

export const PlanLimitResourceType = builder.simpleObject('PlanLimitResource', {
  fields: (t) => ({
    limit: t.int({ nullable: true }),
    current: t.int(),
    percent: t.int({ nullable: true }),
    exhausted: t.boolean(),
  }),
})

export const TenantScopedCatalogsCapabilityType = builder.simpleObject(
  'TenantScopedCatalogsCapability',
  {
    fields: (t) => ({
      allowed: t.boolean(),
    }),
  },
)

export const TenantPlanLimitsResourcesType = builder.simpleObject(
  'TenantPlanLimitsResources',
  {
    fields: (t) => ({
      workspaces: t.field({ type: PlanLimitResourceType }),
      tenantScopedCatalogs: t.field({
        type: TenantScopedCatalogsCapabilityType,
      }),
    }),
  },
)

export const TenantPlanLimitsType = builder.simpleObject('TenantPlanLimits', {
  fields: (t) => ({
    tenantId: t.id(),
    plan: t.field({ type: PlanTierEnum }),
    gracePeriodUntil: t.field({ type: 'DateTime', nullable: true }),
    resources: t.field({ type: TenantPlanLimitsResourcesType }),
  }),
})

export const WorkspacePlanLimitsResourcesType = builder.simpleObject(
  'WorkspacePlanLimitsResources',
  {
    fields: (t) => ({
      members: t.field({ type: PlanLimitResourceType }),
      categories: t.field({ type: PlanLimitResourceType }),
      specialties: t.field({ type: PlanLimitResourceType }),
      activeSchedules: t.field({ type: PlanLimitResourceType }),
      shiftsThisMonth: t.field({ type: PlanLimitResourceType }),
      requestsThisMonth: t.field({ type: PlanLimitResourceType }),
      storageMB: t.field({ type: PlanLimitResourceType }),
    }),
  },
)

export const WorkspacePlanLimitsType = builder.simpleObject(
  'WorkspacePlanLimits',
  {
    fields: (t) => ({
      workspaceId: t.id(),
      tenantId: t.id(),
      plan: t.field({ type: PlanTierEnum }),
      gracePeriodUntil: t.field({ type: 'DateTime', nullable: true }),
      resources: t.field({ type: WorkspacePlanLimitsResourcesType }),
    }),
  },
)
