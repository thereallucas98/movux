import type { CarrierDocument } from '~/generated/prisma/client'
import type {
  CarrierDocumentRepository,
  ListCarrierDocumentsFilter,
} from '../../repositories/carrier-document.repository'

interface ListCarrierDocumentsForAdminRepos {
  carrierDocumentRepo: CarrierDocumentRepository
}

export async function listCarrierDocumentsForAdmin(
  repos: ListCarrierDocumentsForAdminRepos,
  filter: ListCarrierDocumentsFilter,
): Promise<{ data: CarrierDocument[]; nextCursor: string | null }> {
  return repos.carrierDocumentRepo.findByStatus(filter)
}
