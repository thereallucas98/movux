import type {
  ModifierCode,
  ShipmentType,
  TimeWindow,
} from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../repositories/customer-profile.repository'
import type { PricingRepository } from '../../repositories/pricing.repository'
import type {
  AddressInput,
  ShipmentRepository,
  ShipmentWithDetails,
} from '../../repositories/shipment.repository'

interface AddressInputDto {
  street: string
  number: string
  complement?: string
  neighborhoodId: string
  cityId: string
  state: string
  zipCode: string
  lat?: number
  lng?: number
  floor?: number
  hasElevator?: boolean
}

export interface CreateShipmentInput {
  type: ShipmentType
  description: string
  estimatedWeightKg?: number
  estimatedVolumeM3?: number
  requiredCategoryId?: string
  scheduledDate: string
  timeWindow: TimeWindow
  specificTime?: string
  customerSlaHours: number
  origin: AddressInputDto
  destination: AddressInputDto
  modifiers: { modifierCode: ModifierCode; quantity: number }[]
}

export type CreateShipmentResult =
  | { success: true; shipment: ShipmentWithDetails }
  | {
      success: false
      code:
        | 'CUSTOMER_PROFILE_NOT_FOUND'
        | 'INVALID_ADDRESS'
        | 'NO_PRICING_AVAILABLE'
    }

interface CreateShipmentRepos {
  customerProfileRepo: CustomerProfileRepository
  pricingRepo: PricingRepository
  shipmentRepo: ShipmentRepository
}

async function resolveAddress(
  pricingRepo: PricingRepository,
  dto: AddressInputDto,
): Promise<{ address: AddressInput; clusterId: string } | null> {
  const resolved = await pricingRepo.resolveNeighborhood(dto.neighborhoodId)
  if (!resolved) return null

  return {
    clusterId: resolved.clusterId,
    address: {
      street: dto.street,
      number: dto.number,
      complement: dto.complement,
      neighborhoodId: dto.neighborhoodId,
      neighborhoodName: resolved.name,
      cityId: dto.cityId,
      state: dto.state,
      zipCode: dto.zipCode,
      lat: dto.lat,
      lng: dto.lng,
      floor: dto.floor,
      hasElevator: dto.hasElevator,
    },
  }
}

export async function createShipment(
  repos: CreateShipmentRepos,
  userId: string,
  input: CreateShipmentInput,
): Promise<CreateShipmentResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'CUSTOMER_PROFILE_NOT_FOUND' }
  }

  const [origin, destination] = await Promise.all([
    resolveAddress(repos.pricingRepo, input.origin),
    resolveAddress(repos.pricingRepo, input.destination),
  ])
  if (!origin || !destination) {
    return { success: false, code: 'INVALID_ADDRESS' }
  }

  const snapshot = await repos.pricingRepo.findSnapshotForCorridor(
    origin.clusterId,
    destination.clusterId,
    input.type,
  )
  if (!snapshot) {
    return { success: false, code: 'NO_PRICING_AVAILABLE' }
  }

  const modifierDefs = await repos.pricingRepo.findModifiersByCodes(
    input.modifiers.map((m) => m.modifierCode),
  )
  const modifierByCode = new Map(modifierDefs.map((m) => [m.code, m]))

  let modifiersTotalInCents = 0
  const modifiers = input.modifiers.map((m) => {
    const def = modifierByCode.get(m.modifierCode)
    const unitValueInCents = !def
      ? 0
      : def.valueType === 'FIXED'
        ? def.valueInCents
        : Math.round((snapshot.basePriceInCents * def.valueInCents) / 10000)
    modifiersTotalInCents += unitValueInCents * m.quantity
    return {
      modifierCode: m.modifierCode,
      quantity: m.quantity,
      appliedValueInCents: unitValueInCents,
    }
  })

  const suggestedPriceInCents =
    snapshot.basePriceInCents + modifiersTotalInCents

  const shipment = await repos.shipmentRepo.createDraft({
    customerId: customerProfile.id,
    type: input.type,
    description: input.description,
    estimatedWeightKg: input.estimatedWeightKg,
    estimatedVolumeM3: input.estimatedVolumeM3,
    requiredCategoryId: input.requiredCategoryId,
    scheduledDate: new Date(input.scheduledDate),
    timeWindow: input.timeWindow,
    specificTime: input.specificTime
      ? new Date(`1970-01-01T${input.specificTime}:00.000Z`)
      : undefined,
    customerSlaHours: input.customerSlaHours,
    suggestedPriceInCents,
    origin: origin.address,
    destination: destination.address,
    modifiers,
  })

  return { success: true, shipment }
}
