import type { ShipmentType } from '~/generated/prisma/client'
import type {
  BrowseShipmentItem,
  ShipmentRepository,
} from '../../repositories/shipment.repository'

export interface BrowseOpenShipmentsInput {
  cityId?: string
  type?: ShipmentType
  cursor?: string
  limit?: number
}

export interface BrowseOpenShipmentsResult {
  success: true
  data: BrowseShipmentItem[]
  nextCursor: string | null
}

export async function browseOpenShipments(
  shipmentRepo: ShipmentRepository,
  input: BrowseOpenShipmentsInput,
): Promise<BrowseOpenShipmentsResult> {
  const { data, nextCursor } = await shipmentRepo.listOpenForBrowse(input)
  return { success: true, data, nextCursor }
}
