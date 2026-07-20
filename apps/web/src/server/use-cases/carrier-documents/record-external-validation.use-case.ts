import type { CarrierDocumentRepository } from '../../repositories/carrier-document.repository'

export type RecordExternalValidationResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' }

interface RecordExternalValidationRepos {
  carrierDocumentRepo: CarrierDocumentRepository
}

export interface RecordExternalValidationInput {
  result: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE'
  notes?: string
}

export async function recordExternalValidation(
  repos: RecordExternalValidationRepos,
  adminUserId: string,
  documentId: string,
  input: RecordExternalValidationInput,
): Promise<RecordExternalValidationResult> {
  const document = await repos.carrierDocumentRepo.findById(documentId)
  if (!document) {
    return { success: false, code: 'NOT_FOUND' }
  }

  await repos.carrierDocumentRepo.recordExternalValidation(documentId, {
    provider: 'MANUAL',
    result: input.result,
    notes: input.notes,
    checkedBy: adminUserId,
    checkedAt: new Date().toISOString(),
  })

  return { success: true }
}
