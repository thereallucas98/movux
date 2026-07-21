import { builder } from '../builder'

export const ReviewerRoleEnum = builder.enumType('ReviewerRole', {
  values: ['CUSTOMER', 'CARRIER'] as const,
})
