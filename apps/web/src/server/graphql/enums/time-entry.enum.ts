import { builder } from '../builder'

/**
 * Synthetic status derived from TimeEntryRow:
 *   closedAt !== null   → CLOSED
 *   clockOutAt !== null → CLOCKED_OUT
 *   else                → OPEN
 */
export const TimeEntryStatusEnum = builder.enumType('TimeEntryStatus', {
  values: ['OPEN', 'CLOCKED_OUT', 'CLOSED'] as const,
})
