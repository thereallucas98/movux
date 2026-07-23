import type { EventType } from '~/generated/prisma/client'

// Histórico do frete (item #2 do review Metrobi, D-008) — mesma frase pros
// dois lados (customer e carrier), sem resolução de nome de ator nem ícone
// por tipo (isso ficou pro tier "Ideal", não escolhido).
export const SHIPMENT_EVENT_DESCRIPTIONS: Record<EventType, string> = {
  PUBLISHED: 'Frete publicado e visível pra transportadores da região',
  CARRIER_CALLED: 'Um transportador foi chamado pra enviar uma proposta',
  PROPOSAL_RECEIVED: 'Uma proposta foi recebida',
  PROPOSAL_REJECTED: 'Uma proposta foi recusada',
  CARRIER_SELECTED: 'Transportador selecionado',
  SAFETY_CONFIRMED: 'Check-in de segurança confirmado pelos dois lados',
  COLLECTED: 'Carga coletada',
  IN_TRANSIT: 'Frete em trânsito',
  DELIVERED: 'Frete entregue',
  WINDOW_ALERT: 'Alerta de janela de tempo',
  CANCELLED: 'Frete cancelado',
  EXPIRED: 'Frete expirado',
}
