import type {
  ModifierCode,
  PrismaClient,
  Shipment,
  ShipmentAddress,
  ShipmentModifier,
  ShipmentStatus,
  ShipmentType,
  TimeWindow,
  VehicleType,
} from '~/generated/prisma/client'

export interface AddressInput {
  street: string
  number: string
  complement?: string
  neighborhoodId: string
  neighborhoodName: string
  cityId: string
  state: string
  zipCode: string
  lat?: number
  lng?: number
  floor?: number
  hasElevator?: boolean
}

export interface ModifierInput {
  modifierCode: ModifierCode
  quantity: number
  appliedValueInCents: number
}

export interface CreateDraftInput {
  customerId: string
  type: ShipmentType
  description: string
  estimatedWeightKg?: number
  estimatedVolumeM3?: number
  vehicleTypeRequired: VehicleType
  scheduledDate: Date
  timeWindow: TimeWindow
  specificTime?: Date
  customerSlaHours: number
  suggestedPriceInCents: number
  origin: AddressInput
  destination: AddressInput
  modifiers: ModifierInput[]
}

export type ShipmentWithDetails = Shipment & {
  addresses: ShipmentAddress[]
  modifiers: ShipmentModifier[]
}

export interface ListShipmentsFilter {
  status?: ShipmentStatus
  cursor?: string
  limit?: number
}

export interface BrowseFilter {
  cityId?: string
  type?: ShipmentType
  cursor?: string
  limit?: number
}

/** Redacted address — never includes street/number/complement/zipCode/lat/lng/floor/hasElevator. */
export interface BrowseAddressItem {
  type: 'ORIGIN' | 'DESTINATION'
  neighborhoodName: string
  cityId: string
  state: string
}

export type BrowseShipmentItem = Pick<
  Shipment,
  | 'id'
  | 'type'
  | 'description'
  | 'estimatedWeightKg'
  | 'estimatedVolumeM3'
  | 'vehicleTypeRequired'
  | 'scheduledDate'
  | 'timeWindow'
  | 'specificTime'
  | 'suggestedPriceInCents'
  | 'customerSlaHours'
  | 'createdAt'
> & { addresses: BrowseAddressItem[] }

export interface ShipmentRepository {
  createDraft(data: CreateDraftInput): Promise<ShipmentWithDetails>
  findByIdForOwner(
    id: string,
    customerId: string,
  ): Promise<ShipmentWithDetails | null>
  findById(id: string): Promise<ShipmentWithDetails | null>
  findStatusForOwner(
    id: string,
    customerId: string,
  ): Promise<{
    id: string
    status: ShipmentStatus
    deliveredAt: Date | null
    description: string
  } | null>
  findStatusById(id: string): Promise<{
    id: string
    status: ShipmentStatus
    customerId: string
    deliveredAt: Date | null
    description: string
  } | null>
  findForProposal(id: string): Promise<{
    status: ShipmentStatus
    customerSlaHours: number
    customerId: string
    description: string
  } | null>
  updateStatus(id: string, status: ShipmentStatus): Promise<void>
  markCarrierSelected(id: string, finalPriceInCents: number): Promise<void>
  markCollected(id: string): Promise<void>
  markInTransit(id: string): Promise<void>
  markDelivered(id: string): Promise<void>
  listForCustomer(
    customerId: string,
    filter: ListShipmentsFilter,
  ): Promise<{ data: Shipment[]; nextCursor: string | null }>
  listOpenForBrowse(
    filter: BrowseFilter,
  ): Promise<{ data: BrowseShipmentItem[]; nextCursor: string | null }>
}

export const SHIPMENT_BROWSE_SELECT = {
  id: true,
  type: true,
  description: true,
  estimatedWeightKg: true,
  estimatedVolumeM3: true,
  vehicleTypeRequired: true,
  scheduledDate: true,
  timeWindow: true,
  specificTime: true,
  suggestedPriceInCents: true,
  customerSlaHours: true,
  createdAt: true,
  addresses: {
    select: { type: true, neighborhoodName: true, cityId: true, state: true },
  },
} as const

export function createShipmentRepository(
  prisma: PrismaClient,
): ShipmentRepository {
  return {
    async createDraft(data) {
      return prisma.shipment.create({
        data: {
          customerId: data.customerId,
          status: 'DRAFT',
          type: data.type,
          description: data.description,
          estimatedWeightKg: data.estimatedWeightKg,
          estimatedVolumeM3: data.estimatedVolumeM3,
          vehicleTypeRequired: data.vehicleTypeRequired,
          scheduledDate: data.scheduledDate,
          timeWindow: data.timeWindow,
          specificTime: data.specificTime,
          customerSlaHours: data.customerSlaHours,
          suggestedPriceInCents: data.suggestedPriceInCents,
          addresses: {
            create: [
              { type: 'ORIGIN', ...data.origin },
              { type: 'DESTINATION', ...data.destination },
            ],
          },
          modifiers: { create: data.modifiers },
        },
        include: { addresses: true, modifiers: true },
      })
    },

    async findByIdForOwner(id, customerId) {
      return prisma.shipment.findFirst({
        where: { id, customerId },
        include: { addresses: true, modifiers: true },
      })
    },

    async findById(id) {
      return prisma.shipment.findUnique({
        where: { id },
        include: { addresses: true, modifiers: true },
      })
    },

    async findStatusForOwner(id, customerId) {
      return prisma.shipment.findFirst({
        where: { id, customerId },
        select: {
          id: true,
          status: true,
          deliveredAt: true,
          description: true,
        },
      })
    },

    async findStatusById(id) {
      return prisma.shipment.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          customerId: true,
          deliveredAt: true,
          description: true,
        },
      })
    },

    async findForProposal(id) {
      return prisma.shipment.findUnique({
        where: { id },
        select: {
          status: true,
          customerSlaHours: true,
          customerId: true,
          description: true,
        },
      })
    },

    async updateStatus(id, status) {
      await prisma.shipment.update({ where: { id }, data: { status } })
    },

    async markCarrierSelected(id, finalPriceInCents) {
      await prisma.shipment.update({
        where: { id },
        data: { status: 'CARRIER_SELECTED', finalPriceInCents },
      })
    },

    async markCollected(id) {
      await prisma.shipment.update({
        where: { id },
        data: { status: 'COLLECTED', collectedAt: new Date() },
      })
    },

    async markInTransit(id) {
      await prisma.shipment.update({
        where: { id },
        data: { status: 'IN_TRANSIT', inTransitAt: new Date() },
      })
    },

    async markDelivered(id) {
      await prisma.shipment.update({
        where: { id },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      })
    },

    async listForCustomer(customerId, filter) {
      const limit = filter.limit ?? 20
      const data = await prisma.shipment.findMany({
        where: {
          customerId,
          ...(filter.status ? { status: filter.status } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      })

      const hasMore = data.length > limit
      const page = hasMore ? data.slice(0, limit) : data
      const nextCursor = hasMore ? page[page.length - 1].id : null

      return { data: page, nextCursor }
    },

    async listOpenForBrowse(filter) {
      const limit = filter.limit ?? 20
      const data = await prisma.shipment.findMany({
        where: {
          status: { in: ['OPEN', 'PROPOSALS_RECEIVED'] },
          ...(filter.type ? { type: filter.type } : {}),
          ...(filter.cityId
            ? { addresses: { some: { type: 'ORIGIN', cityId: filter.cityId } } }
            : {}),
        },
        select: SHIPMENT_BROWSE_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      })

      const hasMore = data.length > limit
      const page = hasMore ? data.slice(0, limit) : data
      const nextCursor = hasMore ? page[page.length - 1].id : null

      return { data: page, nextCursor }
    },
  }
}
