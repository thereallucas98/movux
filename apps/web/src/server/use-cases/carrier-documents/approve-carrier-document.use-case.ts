import type { CarrierProfileRepository } from '../../repositories/carrier-profile.repository'
import type { CarrierDocumentRepository } from '../../repositories/carrier-document.repository'
import { CARRIER_DOCUMENT_TYPES } from '../../schemas/carrier-document.schema'

export type ApproveCarrierDocumentResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface ApproveCarrierDocumentRepos {
  carrierDocumentRepo: CarrierDocumentRepository
  carrierProfileRepo: CarrierProfileRepository
}

export async function approveCarrierDocument(
  repos: ApproveCarrierDocumentRepos,
  adminUserId: string,
  documentId: string,
): Promise<ApproveCarrierDocumentResult> {
  const document = await repos.carrierDocumentRepo.findById(documentId)
  if (!document || !document.carrierId) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (document.status !== 'PENDING') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.carrierDocumentRepo.updateStatus(documentId, 'APPROVED', adminUserId)

  const approvedTypes = await repos.carrierDocumentRepo.findApprovedTypesByCarrier(
    document.carrierId,
  )
  const hasAllRequiredTypes = CARRIER_DOCUMENT_TYPES.every((type) =>
    approvedTypes.includes(type),
  )
  if (hasAllRequiredTypes) {
    await repos.carrierProfileRepo.markVerified(document.carrierId, adminUserId)
  }

  return { success: true }
}
