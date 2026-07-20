import { z } from 'zod'

export const CARRIER_DOCUMENT_TYPES = [
  'CPF',
  'CNH_FRONT',
  'CNH_BACK',
  'ADDRESS_PROOF',
  'SELFIE',
] as const

export const DocumentTypeSchema = z.enum(CARRIER_DOCUMENT_TYPES)

export const DOCUMENT_MIME_WHITELIST = ['image/jpeg', 'image/png', 'application/pdf'] as const

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

export type ParseDocumentResult =
  | { success: true; file: File }
  | { success: false; code: 'ATTACHMENT_INVALID' }

export function parseDocumentField(formData: FormData): ParseDocumentResult {
  const raw = formData.get('file')
  if (!(raw instanceof File) || raw.size === 0) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  if (raw.size > DOCUMENT_MAX_BYTES) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  if (!DOCUMENT_MIME_WHITELIST.includes(raw.type as (typeof DOCUMENT_MIME_WHITELIST)[number])) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  return { success: true, file: raw }
}

export const CarrierDocumentIdParamSchema = z.object({
  documentId: z.uuid(),
})

export const RejectCarrierDocumentSchema = z.object({
  rejectionReason: z.string().min(1),
})

export const ListCarrierDocumentsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
