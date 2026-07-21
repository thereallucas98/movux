import { builder } from '../builder'
import { ReviewerRoleEnum } from '../enums/shipment-lifecycle.enum'
import { ProposalStatusEnum } from '../enums/proposal.enum'

export const SafetyCheckInType = builder.simpleObject('SafetyCheckIn', {
  fields: (t) => ({
    id: t.id(),
    role: t.field({ type: ReviewerRoleEnum }),
    confirmedAt: t.field({ type: 'DateTime' }),
  }),
})

export const SafetyCheckInStatusType = builder.simpleObject(
  'SafetyCheckInStatus',
  {
    fields: (t) => ({
      customer: t.field({ type: SafetyCheckInType, nullable: true }),
      carrier: t.field({ type: SafetyCheckInType, nullable: true }),
    }),
  },
)

export const DeliveryConfirmationType = builder.simpleObject(
  'DeliveryConfirmation',
  {
    fields: (t) => ({
      id: t.id(),
      confirmed: t.boolean(),
      issueDescription: t.string({ nullable: true }),
      confirmedAt: t.field({ type: 'DateTime' }),
    }),
  },
)

export const ReviewType = builder.simpleObject('Review', {
  fields: (t) => ({
    id: t.id(),
    reviewerRole: t.field({ type: ReviewerRoleEnum }),
    rating: t.int(),
    createdAt: t.field({ type: 'DateTime' }),
  }),
})

// Vitrine da lista de propostas pro customer decidir aceitar/rejeitar —
// carrega o nome do transportador e o preço da tentativa mais recente,
// resolvidos no próprio resolver da query (não é um passthrough do
// `ProposalType` existente, que não tem PII de carrier nem preço).
export const ProposalForCustomerType = builder.simpleObject(
  'ProposalForCustomer',
  {
    fields: (t) => ({
      id: t.id(),
      status: t.field({ type: ProposalStatusEnum }),
      carrierId: t.id(),
      carrierName: t.string(),
      priceInCents: t.int(),
      currentAttempt: t.int(),
      expiresAt: t.field({ type: 'DateTime' }),
      createdAt: t.field({ type: 'DateTime' }),
    }),
  },
)
