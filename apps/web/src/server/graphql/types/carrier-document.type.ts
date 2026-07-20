import type {
  CarrierDocumentWithCarrier,
  ExternalValidationEnvelope,
} from '~/server/repositories/carrier-document.repository'
import { builder } from '../builder'
import {
  CarrierDocumentTypeEnum,
  ExternalValidationResultEnum,
  VerificationStatusEnum,
} from '../enums/carrier-document.enum'

export const ExternalValidationType = builder.simpleObject(
  'ExternalValidation',
  {
    fields: (t) => ({
      provider: t.string(),
      result: t.field({ type: ExternalValidationResultEnum }),
      notes: t.string({ nullable: true }),
      checkedBy: t.id(),
      checkedAt: t.field({ type: 'DateTime' }),
    }),
  },
)

export const CarrierDocumentType = builder.simpleObject('CarrierDocument', {
  fields: (t) => ({
    id: t.id(),
    type: t.field({ type: CarrierDocumentTypeEnum }),
    fileUrl: t.string(),
    status: t.field({ type: VerificationStatusEnum }),
    rejectionReason: t.string({ nullable: true }),
    uploadedAt: t.field({ type: 'DateTime' }),
    reviewedAt: t.field({ type: 'DateTime', nullable: true }),
    carrierName: t.string({ nullable: true }),
    carrierEmail: t.string({ nullable: true }),
    externalValidation: t.field({
      type: ExternalValidationType,
      nullable: true,
    }),
  }),
})

export const CarrierDocumentConnectionType = builder.simpleObject(
  'CarrierDocumentConnection',
  {
    fields: (t) => ({
      data: t.field({ type: [CarrierDocumentType] }),
      nextCursor: t.id({ nullable: true }),
    }),
  },
)

/** Achata `carrier.fullName`/`email` + normaliza o `Json` de `externalValidation`. */
export function toGraphQLCarrierDocument(doc: CarrierDocumentWithCarrier) {
  return {
    ...doc,
    carrierName: doc.carrier?.fullName ?? null,
    carrierEmail: doc.carrier?.email ?? null,
    externalValidation:
      doc.externalValidation as ExternalValidationEnvelope | null,
  }
}
