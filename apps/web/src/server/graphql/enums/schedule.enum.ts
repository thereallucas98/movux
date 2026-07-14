import { builder } from '../builder'

export const ScheduleStatusEnum = builder.enumType('ScheduleStatus', {
  values: ['DRAFT', 'PUBLISHED', 'CLOSED'] as const,
})
