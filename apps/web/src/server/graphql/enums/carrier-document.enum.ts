import { builder } from '../builder'

export const CarrierDocumentTypeEnum = builder.enumType('CarrierDocumentType', {
  values: [
    'CPF',
    'CNH_FRONT',
    'CNH_BACK',
    'ADDRESS_PROOF',
    'SELFIE',
    'CNPJ',
    'SOCIAL_CONTRACT',
  ] as const,
})

export const VerificationStatusEnum = builder.enumType('VerificationStatus', {
  values: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const,
})

export const ExternalValidationResultEnum = builder.enumType(
  'ExternalValidationResult',
  {
    values: ['MATCH', 'MISMATCH', 'INCONCLUSIVE'] as const,
  },
)
