import { Tag, type TagProps } from '~/components/ui/tag'

export type ShiftTimelineEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'CANCELLED'
  | 'COMPOSITION_SET'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'TRANSFER_REQUESTED'
  | 'TRANSFER_APPROVED'
  | 'TRANSFER_REJECTED'
  | 'TRANSFER_CANCELLED'
  | 'CANDIDATE_APPLIED'
  | 'CANDIDATE_APPROVED'
  | 'CANDIDATE_REJECTED'
  | 'CANDIDATE_WITHDRAWN'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'CLT_WARNING'
  | 'PENDING_CLOSURE'
  | 'COMPLETED'
  | 'FILLED'
  | 'UNFILLED'
  | 'ASSIGNMENT_CANCELLED_BY_OFFER'
  | 'ASSIGNMENT_CANCELLED_BY_TIME_OFF'
  | 'REQUEST_SWAP_SUBMITTED'
  | 'REQUEST_SWAP_APPROVED'
  | 'REQUEST_SWAP_REJECTED'
  | 'REQUEST_SWAP_CANCELLED'
  | 'REQUEST_SWAP_PEER_ACCEPTED'
  | 'REQUEST_SWAP_PEER_REJECTED'
  | 'REQUEST_OFFER_SUBMITTED'
  | 'REQUEST_OFFER_APPROVED'
  | 'REQUEST_OFFER_REJECTED'
  | 'REQUEST_OFFER_CANCELLED'
  | 'NOTE_ADDED'

export interface EventMeta {
  label: string
  category: NonNullable<TagProps['category']>
  renderBody?: (payload: Record<string, unknown> | null) => string | null
}

export const EVENT_META: Record<ShiftTimelineEventType, EventMeta> = {
  // Lifecycle
  CREATED: { label: 'Turno criado', category: 'gray' },
  UPDATED: { label: 'Turno atualizado', category: 'gray' },
  CANCELLED: { label: 'Turno cancelado', category: 'red' },
  COMPOSITION_SET: { label: 'Composição definida', category: 'blue' },
  FILLED: { label: 'Turno completo', category: 'green' },
  UNFILLED: { label: 'Vaga aberta', category: 'orange' },
  COMPLETED: { label: 'Turno concluído', category: 'green' },
  PENDING_CLOSURE: { label: 'Aguardando fechamento', category: 'orange' },

  // Assignment
  ASSIGNED: { label: 'Atribuído', category: 'blue' },
  UNASSIGNED: { label: 'Atribuição cancelada', category: 'gray' },
  ACCEPTED: { label: 'Aceitou', category: 'green' },
  REJECTED: { label: 'Rejeitou', category: 'red' },
  ASSIGNMENT_CANCELLED_BY_OFFER: {
    label: 'Cancelado por oferta',
    category: 'purple',
  },
  ASSIGNMENT_CANCELLED_BY_TIME_OFF: {
    label: 'Cancelado por folga',
    category: 'pink',
  },

  // Transfer
  TRANSFER_REQUESTED: { label: 'Transferência solicitada', category: 'yellow' },
  TRANSFER_APPROVED: { label: 'Transferência aprovada', category: 'green' },
  TRANSFER_REJECTED: { label: 'Transferência rejeitada', category: 'red' },
  TRANSFER_CANCELLED: { label: 'Transferência cancelada', category: 'gray' },

  // Candidate
  CANDIDATE_APPLIED: { label: 'Candidatou-se', category: 'yellow' },
  CANDIDATE_APPROVED: { label: 'Candidato aprovado', category: 'green' },
  CANDIDATE_REJECTED: { label: 'Candidato rejeitado', category: 'red' },
  CANDIDATE_WITHDRAWN: { label: 'Candidatura retirada', category: 'gray' },

  // Time tracking
  CLOCK_IN: { label: 'Bateu ponto (entrada)', category: 'green' },
  CLOCK_OUT: { label: 'Bateu ponto (saída)', category: 'green' },
  CLT_WARNING: { label: 'Aviso CLT', category: 'red' },

  // Request — SWAP
  REQUEST_SWAP_SUBMITTED: { label: 'Troca solicitada', category: 'blue' },
  REQUEST_SWAP_PEER_ACCEPTED: {
    label: 'Troca: par aceitou',
    category: 'yellow',
  },
  REQUEST_SWAP_PEER_REJECTED: { label: 'Troca: par rejeitou', category: 'red' },
  REQUEST_SWAP_APPROVED: { label: 'Troca aprovada', category: 'green' },
  REQUEST_SWAP_REJECTED: { label: 'Troca rejeitada', category: 'red' },
  REQUEST_SWAP_CANCELLED: { label: 'Troca cancelada', category: 'gray' },

  // Request — OFFER
  REQUEST_OFFER_SUBMITTED: { label: 'Oferta criada', category: 'purple' },
  REQUEST_OFFER_APPROVED: { label: 'Oferta aprovada', category: 'green' },
  REQUEST_OFFER_REJECTED: { label: 'Oferta rejeitada', category: 'red' },
  REQUEST_OFFER_CANCELLED: { label: 'Oferta cancelada', category: 'gray' },

  // Note
  NOTE_ADDED: {
    label: 'Nota',
    category: 'gray',
    renderBody: (payload) => {
      const note = (payload as { note?: string } | null)?.note
      return typeof note === 'string' && note.length > 0 ? note : null
    },
  },
}

export const FALLBACK_EVENT_META: EventMeta = {
  label: 'Evento',
  category: 'gray',
}

export function ShiftTimelineEventTag({
  type,
}: {
  type: ShiftTimelineEventType
}) {
  const meta = EVENT_META[type] ?? FALLBACK_EVENT_META
  return <Tag category={meta.category}>{meta.label}</Tag>
}
