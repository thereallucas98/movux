import { builder } from '../builder'

export const ShiftStatusEnum = builder.enumType('ShiftStatus', {
  values: ['OPEN', 'FILLED', 'CANCELLED', 'COMPLETED'] as const,
})
