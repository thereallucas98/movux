import { builder } from '../builder'

export const ShiftAssignmentModeEnum = builder.enumType('ShiftAssignmentMode', {
  values: ['DIRECT_ASSIGN', 'OPEN_FOR_APPLY'] as const,
})

export const ShiftCandidateStatusEnum = builder.enumType(
  'ShiftCandidateStatus',
  {
    values: ['QUEUED', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const,
  },
)
