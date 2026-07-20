import { DocumentRejected } from '~/lib/email/templates/document-rejected'
import { sendEmailNotification } from '../../notifications/send-email-notification'
import type { CarrierDocumentRepository } from '../../repositories/carrier-document.repository'
import type { NotificationLogRepository } from '../../repositories/notification-log.repository'
import type { UserRepository } from '../../repositories/user.repository'

export type RejectCarrierDocumentResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface RejectCarrierDocumentRepos {
  carrierDocumentRepo: CarrierDocumentRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
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

  if (document.carrierId) {
    const carrier = await repos.userRepo.findById(document.carrierId)
    if (carrier) {
      await sendEmailNotification(repos.notificationLogRepo, {
        userId: carrier.id,
        to: carrier.email,
        subject: 'Documento precisa de atenção — Movux',
        react: DocumentRejected({
          carrierName: carrier.fullName,
          documentType: document.type,
          rejectionReason,
        }),
        templateCode: 'DOCUMENT_REJECTED',
      })
    }
  }

  return { success: true }
}
