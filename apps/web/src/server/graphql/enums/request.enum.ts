import { builder } from '../builder'

export const RequestTypeEnum = builder.enumType('RequestType', {
  values: ['SWAP', 'OFFER', 'TIME_OFF'] as const,
})

export const RequestStatusEnum = builder.enumType('RequestStatus', {
  values: [
    'PENDING_PEER',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
  ] as const,
})

export const PeerRespondDecisionEnum = builder.enumType('PeerRespondDecision', {
  values: ['ACCEPT', 'REJECT'] as const,
})

export const RequestResolveDecisionEnum = builder.enumType(
  'RequestResolveDecision',
  { values: ['APPROVE', 'REJECT'] as const },
)

export const RequestScopeEnum = builder.enumType('RequestScope', {
  values: ['mine', 'workspace'] as const,
})
