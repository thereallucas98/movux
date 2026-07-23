import { builder } from '../builder'
import { ReviewerRoleEnum } from '../enums/shipment-lifecycle.enum'
import { ProposalStatusEnum, ResponseTypeEnum } from '../enums/proposal.enum'

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
    tags: t.stringList(),
    createdAt: t.field({ type: 'DateTime' }),
  }),
})

// Achado #10 da QA momento-zero — tags de complemento pra avaliação, pra
// popular o picker do lado que está avaliando (customer avalia carrier com
// tags CARRIER, carrier avalia customer com tags CUSTOMER).
export const ReviewTagOptionType = builder.simpleObject('ReviewTagOption', {
  fields: (t) => ({
    id: t.id(),
    code: t.string(),
    label: t.string(),
  }),
})

// Vitrine da lista de propostas pro customer decidir aceitar/rejeitar —
// carrega nome/telefone/nota do transportador e o preço da tentativa mais
// recente, resolvidos no próprio resolver da query (não é um passthrough do
// `ProposalType` existente, que não tem PII de carrier nem preço). Achado #8
// da QA momento-zero: cliente decidia só com nome+preço, às cegas — agora
// telefone/nota vêm junto pra abrir num modal antes de aceitar/recusar.
export const ProposalForCustomerType = builder.simpleObject(
  'ProposalForCustomer',
  {
    fields: (t) => ({
      id: t.id(),
      status: t.field({ type: ProposalStatusEnum }),
      carrierId: t.id(),
      carrierName: t.string(),
      carrierPhone: t.string({ nullable: true }),
      carrierAvgRating: t.float({ nullable: true }),
      priceInCents: t.int(),
      currentAttempt: t.int(),
      currentAttemptResponseType: t.field({
        type: ResponseTypeEnum,
        nullable: true,
      }),
      expiresAt: t.field({ type: 'DateTime' }),
      createdAt: t.field({ type: 'DateTime' }),
    }),
  },
)

// Cartão de contato da contraparte (D-007) — nome/nota sempre vêm
// preenchidos assim que o transportador é selecionado; telefone vem junto
// na mesma query (a revelação atrás do clique "Mostrar telefone" é só de
// UI, não é mascarado no backend).
export const CounterpartInfoType = builder.simpleObject('CounterpartInfo', {
  fields: (t) => ({
    fullName: t.string(),
    avgRating: t.float({ nullable: true }),
    phone: t.string({ nullable: true }),
    topTagLabel: t.string({ nullable: true }),
  }),
})
