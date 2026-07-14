import { builder } from '../builder'

export const TransferRequestStatusEnum = builder.enumType(
  'TransferRequestStatus',
  {
    values: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const,
  },
)

export const TransferDecisionEnum = builder.enumType('TransferDecision', {
  values: ['APPROVE', 'REJECT'] as const,
})
