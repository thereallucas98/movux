import { z } from 'zod'
import { todayInBrazil } from '~/lib/date-br'
import { slaHoursSchema } from './sla-hours.schema'

const shipmentTypeSchema = z.enum([
  'RESIDENTIAL_MOVING',
  'COMMERCIAL_FREIGHT',
  'DELIVERY',
  'OTHER',
])

const vehicleTypeSchema = z.enum([
  'ANY',
  'MOTORCYCLE',
  'VAN',
  'TRUCK_SMALL',
  'TRUCK_LARGE',
])

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
  street: z.string().min(1, 'Informe a rua'),
  number: z.string().min(1, 'Informe o número'),
  complement: z.string().optional(),
  neighborhoodId: z.uuid('Selecione um bairro'),
  cityId: z.uuid('Selecione um bairro'),
  state: z.string().length(2, 'Selecione um bairro'),
  zipCode: z.string().min(8, 'CEP inválido'),
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
    description: z.string().min(1, 'Descreva o que será transportado'),
    estimatedWeightKg: z.number().positive().optional(),
    estimatedVolumeM3: z.number().positive().optional(),
    vehicleTypeRequired: vehicleTypeSchema,
    scheduledDate: z.iso
      .date({ error: 'Selecione uma data' })
      .refine((value) => value >= todayInBrazil(), {
        message: 'A data não pode ser no passado',
      }),
    timeWindow: timeWindowSchema,
    specificTime: z.string().optional(),
    customerSlaHours: slaHoursSchema('Selecione um prazo de resposta'),
    origin: ShipmentAddressSchema,
    destination: ShipmentAddressSchema,
    modifiers: z.array(ShipmentModifierInputSchema).default([]),
  })
  .refine((data) => data.timeWindow !== 'SPECIFIC' || !!data.specificTime, {
    message: 'Informe o horário específico',
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

export const BrowseShipmentsQuerySchema = z.object({
  cityId: z.uuid().optional(),
  type: shipmentTypeSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
