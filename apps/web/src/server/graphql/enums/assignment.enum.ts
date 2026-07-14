import { builder } from '../builder'

export const AssignmentStatusEnum = builder.enumType('AssignmentStatus', {
  values: [
    'PENDING_ACCEPT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED',
    'TRANSFERRED',
    'PENDING_CLOSURE',
    'COMPLETED',
  ] as const,
})

export const CompositionStatusEnum = builder.enumType('CompositionStatus', {
  values: ['MATCH', 'MISMATCH', 'UNKNOWN'] as const,
})
