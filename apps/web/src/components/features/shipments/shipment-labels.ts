import type {
  ShipmentType,
  TimeWindow,
  VehicleType,
} from '~/graphql/generated/types'

export const SHIPMENT_TYPE_LABELS: Record<ShipmentType, string> = {
  RESIDENTIAL_MOVING: 'Mudança residencial',
  COMMERCIAL_FREIGHT: 'Frete comercial',
  DELIVERY: 'Entrega',
  OTHER: 'Outro',
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  ANY: 'Qualquer veículo',
  MOTORCYCLE: 'Moto',
  VAN: 'Van',
  TRUCK_SMALL: 'Caminhão pequeno',
  TRUCK_LARGE: 'Caminhão grande',
}

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  EVENING: 'Noite',
  SPECIFIC: 'Horário específico',
}

export const CUSTOMER_SLA_HOURS_OPTIONS = [4, 6, 8, 12, 24] as const
