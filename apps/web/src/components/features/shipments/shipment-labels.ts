import type { ShipmentType, TimeWindow } from '~/graphql/generated/types'

export const SHIPMENT_TYPE_LABELS: Record<ShipmentType, string> = {
  RESIDENTIAL_MOVING: 'Mudança residencial',
  COMMERCIAL_FREIGHT: 'Frete comercial',
  DELIVERY: 'Entrega',
  OTHER: 'Outro',
}

// Categorias de veículo (S10-T1) agora vêm do banco via useVehicleTaxonomy —
// sem mapa estático, o nome já é PT-BR direto na VehicleCategory.

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  EVENING: 'Noite',
  SPECIFIC: 'Horário específico',
}

export const CUSTOMER_SLA_HOURS_OPTIONS = [4, 6, 8, 12, 24] as const
