import type {
  CarrierQueueEntryRow,
  ProposalQueueRepository,
} from '../../../repositories/proposal-queue.repository'

export interface ListMyQueueEntriesInput {
  cursor?: string
  limit?: number
}

export interface ListMyQueueEntriesResult {
  success: true
  data: CarrierQueueEntryRow[]
  nextCursor: string | null
}

export async function listMyQueueEntries(
  queueRepo: ProposalQueueRepository,
  carrierId: string,
  filter: ListMyQueueEntriesInput,
): Promise<ListMyQueueEntriesResult> {
  const { data, nextCursor } = await queueRepo.listByCarrier(carrierId, filter)
  return { success: true, data, nextCursor }
}
