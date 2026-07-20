import type { CarrierDocumentType } from '~/graphql/generated/types'

export const CARRIER_DOCUMENT_TYPE_LABELS: Record<CarrierDocumentType, string> =
  {
    CPF: 'CPF',
    CNH_FRONT: 'CNH (frente)',
    CNH_BACK: 'CNH (verso)',
    ADDRESS_PROOF: 'Comprovante de endereço',
    SELFIE: 'Selfie',
    CNPJ: 'CNPJ',
    SOCIAL_CONTRACT: 'Contrato social',
  }

const EXTERNAL_VALIDATION_RESULT_LABELS: Record<string, string> = {
  MATCH: 'Confere',
  MISMATCH: 'Não confere',
  INCONCLUSIVE: 'Inconclusivo',
}

export function externalValidationResultLabel(result: string): string {
  return EXTERNAL_VALIDATION_RESULT_LABELS[result] ?? result
}
