import type { CarrierDocumentRepository } from '../../repositories/carrier-document.repository'

export type RejectCarrierDocumentResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface RejectCarrierDocumentRepos {
  carrierDocumentRepo: CarrierDocumentRepository
}

export async function rejectCarrierDocument(
  repos: RejectCarrierDocumentRepos,
  adminUserId: string,
  documentId: string,
  rejectionReason: string,
): Promise<RejectCarrierDocumentResult> {
  const document = await repos.carrierDocumentRepo.findById(documentId)
  if (!document) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (document.status !== 'PENDING') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.carrierDocumentRepo.updateStatus(
    documentId,
    'REJECTED',
    adminUserId,
    rejectionReason,
  )

  return { success: true }
}
