import type {
  CarrierDocumentRepository,
  CarrierDocumentWithCarrier,
  ListCarrierDocumentsFilter,
} from '../../repositories/carrier-document.repository'

interface ListCarrierDocumentsForAdminRepos {
  carrierDocumentRepo: CarrierDocumentRepository
}

export async function listCarrierDocumentsForAdmin(
  repos: ListCarrierDocumentsForAdminRepos,
  filter: ListCarrierDocumentsFilter,
): Promise<{ data: CarrierDocumentWithCarrier[]; nextCursor: string | null }> {
  return repos.carrierDocumentRepo.findByStatus(filter)
}
