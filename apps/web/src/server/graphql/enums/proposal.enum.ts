import { builder } from '../builder'

export const QueueEntryStatusEnum = builder.enumType('QueueEntryStatus', {
  values: ['WAITING', 'CALLED', 'ACTIVE', 'EXHAUSTED', 'WITHDRAWN'] as const,
})

export const ProposalStatusEnum = builder.enumType('ProposalStatus', {
  values: ['ACTIVE', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'] as const,
})

export const ResponseTypeEnum = builder.enumType('ResponseType', {
  values: ['PENDING', 'ACCEPTED', 'REJECTED'] as const,
})
