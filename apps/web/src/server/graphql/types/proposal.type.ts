import { builder } from '../builder'
import { ProposalStatusEnum, ResponseTypeEnum } from '../enums/proposal.enum'

export const ProposalAttemptType = builder.simpleObject('ProposalAttempt', {
  fields: (t) => ({
    id: t.id(),
    attemptNumber: t.int(),
    priceInCents: t.int(),
    message: t.string({ nullable: true }),
    proposedAt: t.field({ type: 'DateTime' }),
    respondedAt: t.field({ type: 'DateTime', nullable: true }),
    responseType: t.field({ type: ResponseTypeEnum }),
  }),
})

export const ProposalType = builder.simpleObject('Proposal', {
  fields: (t) => ({
    id: t.id(),
    status: t.field({ type: ProposalStatusEnum }),
    currentAttempt: t.int(),
    customerSlaHours: t.int(),
    carrierSlaHours: t.int(),
    agreedSlaHours: t.int(),
    expiresAt: t.field({ type: 'DateTime' }),
    createdAt: t.field({ type: 'DateTime' }),
    attempts: t.field({ type: [ProposalAttemptType] }),
  }),
})
