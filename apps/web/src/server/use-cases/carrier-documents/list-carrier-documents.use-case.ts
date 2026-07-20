import type { CarrierDocument } from '~/generated/prisma/client'
import type { CarrierDocumentRepository } from '../../repositories/carrier-document.repository'

interface ListCarrierDocumentsRepos {
  carrierDocumentRepo: CarrierDocumentRepository
}

export async function listCarrierDocuments(
  repos: ListCarrierDocumentsRepos,
  userId: string,
): Promise<{ documents: CarrierDocument[] }> {
  const documents = await repos.carrierDocumentRepo.findByCarrier(userId)
  return { documents }
}
