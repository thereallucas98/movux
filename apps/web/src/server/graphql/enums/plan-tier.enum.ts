import { builder } from '../builder'

export const PlanTierEnum = builder.enumType('PlanTier', {
  values: ['FREE', 'SMALL_TEAM', 'BUSINESS', 'CORPORATE'] as const,
})
