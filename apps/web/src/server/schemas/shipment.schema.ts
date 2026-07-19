import { z } from 'zod'

const shipmentTypeSchema = z.enum([
  'RESIDENTIAL_MOVING',
  'COMMERCIAL_FREIGHT',
  'DELIVERY',
  'OTHER',
])

const vehicleTypeSchema = z.enum(['ANY', 'MOTORCYCLE', 'VAN', 'TRUCK_SMALL', 'TRUCK_LARGE'])

const timeWindowSchema = z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'SPECIFIC'])

const modifierCodeSchema = z.enum([
  'FLOOR',
  'HELPER',
  'DISASSEMBLY',
  'PACKING',
  'DIFFICULT_ACCESS',
  'NIGHT_WEEKEND',
])

const shipmentStatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'PROPOSALS_RECEIVED',
  'CARRIER_SELECTED',
  'COLLECTED',
  'IN_TRANSIT',
  'DELIVERED',
  'REVIEWED',
  'CANCELLED',
  'EXPIRED',
])

export const ShipmentAddressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhoodId: z.uuid(),
  cityId: z.uuid(),
  state: z.string().length(2),
  zipCode: z.string().min(8),
  lat: z.number().optional(),
  lng: z.number().optional(),
  floor: z.number().int().optional(),
  hasElevator: z.boolean().optional(),
})

export const ShipmentModifierInputSchema = z.object({
  modifierCode: modifierCodeSchema,
  quantity: z.number().int().positive().default(1),
})

export const CreateShipmentSchema = z
  .object({
    type: shipmentTypeSchema,
    description: z.string().min(1),
    estimatedWeightKg: z.number().positive().optional(),
    estimatedVolumeM3: z.number().positive().optional(),
    vehicleTypeRequired: vehicleTypeSchema,
    scheduledDate: z.iso.date(),
    timeWindow: timeWindowSchema,
    specificTime: z.string().optional(),
    customerSlaHours: z.union([
      z.literal(4),
      z.literal(6),
      z.literal(8),
      z.literal(12),
      z.literal(24),
    ]),
    origin: ShipmentAddressSchema,
    destination: ShipmentAddressSchema,
    modifiers: z.array(ShipmentModifierInputSchema).default([]),
  })
  .refine((data) => data.timeWindow !== 'SPECIFIC' || !!data.specificTime, {
    message: 'specificTime is required when timeWindow = SPECIFIC',
    path: ['specificTime'],
  })

export const ListShipmentsQuerySchema = z.object({
  status: shipmentStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

export const ShipmentIdParamSchema = z.object({
  shipmentId: z.uuid(),
})
