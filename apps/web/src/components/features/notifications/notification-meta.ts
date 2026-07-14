import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Clock4,
  Inbox,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { NotificationType } from '~/generated/prisma/client'
import type {
  AnyNotificationPayload,
  AssignmentCreatedPayload,
  AssignmentDecidedPayload,
  CandidateDecidedPayload,
  CandidateQueuedPayload,
  CandidateWithdrawnPayload,
  RequestPeerDecisionPayload,
  RequestResolvedPayload,
  RequestSubmittedPayload,
  ScheduleClosedPayload,
  SchedulePublishedPayload,
  ShiftCancelledPayload,
  TransferRequestedPayload,
} from '~/server/notifications/payloads'
import type { TagProps } from '~/components/ui/tag'

type Category = NonNullable<TagProps['category']>

export interface NotificationMeta<P = AnyNotificationPayload> {
  label: string
  Icon: LucideIcon
  category: Category
  copy: (payload: P, principalUserId: string) => string
  deepLink: (payload: P, principalUserId: string) => string
}

function shiftDeepLink(p: { scheduleId: string; shiftId: string }): string {
  return `/schedules/${p.scheduleId}/shifts/${p.shiftId}`
}

const META: Record<NotificationType, NotificationMeta> = {
  SCHEDULE_PUBLISHED: {
    label: 'Escala publicada',
    Icon: CalendarCheck,
    category: 'green',
    copy: (raw) => {
      const p = raw as SchedulePublishedPayload
      return `Uma nova escala foi publicada${p.scheduleName ? `: ${p.scheduleName}` : ''}.`
    },
    deepLink: (raw) => {
      const p = raw as SchedulePublishedPayload
      return `/schedules/${p.entityId}`
    },
  },
  SCHEDULE_CLOSED: {
    label: 'Escala fechada',
    Icon: CalendarX,
    category: 'gray',
    copy: (raw) => {
      const p = raw as ScheduleClosedPayload
      return p.closedEarly
        ? 'A escala foi fechada antes do fim do período.'
        : 'A escala foi fechada.'
    },
    deepLink: (raw) => {
      const p = raw as ScheduleClosedPayload
      return `/schedules/${p.entityId}`
    },
  },
  SHIFT_CANCELLED: {
    label: 'Turno cancelado',
    Icon: CalendarX,
    category: 'red',
    copy: (raw) => {
      const p = raw as ShiftCancelledPayload
      return p.reason
        ? `Um turno foi cancelado: ${p.reason}`
        : 'Um turno foi cancelado.'
    },
    deepLink: (raw) => {
      const p = raw as ShiftCancelledPayload
      return shiftDeepLink({ scheduleId: p.scheduleId, shiftId: p.entityId })
    },
  },
  ASSIGNMENT_CREATED: {
    label: 'Nova atribuição',
    Icon: UserPlus,
    category: 'blue',
    copy: (raw) => {
      const p = raw as AssignmentCreatedPayload
      return p.autoAccepted
        ? 'Você foi atribuído(a) a um turno (aceito automaticamente).'
        : 'Você foi atribuído(a) a um turno. Aceite ou recuse antes do prazo.'
    },
    deepLink: (raw) => {
      const p = raw as AssignmentCreatedPayload
      return shiftDeepLink({ scheduleId: p.scheduleId, shiftId: p.shiftId })
    },
  },
  ASSIGNMENT_ACCEPTED: {
    label: 'Atribuição aceita',
    Icon: ThumbsUp,
    category: 'green',
    copy: () => 'Um(a) profissional aceitou a atribuição.',
    deepLink: (raw) => {
      const p = raw as AssignmentDecidedPayload
      return shiftDeepLink({ scheduleId: p.scheduleId, shiftId: p.shiftId })
    },
  },
  ASSIGNMENT_REJECTED: {
    label: 'Atribuição rejeitada',
    Icon: ThumbsDown,
    category: 'red',
    copy: (raw) => {
      const p = raw as AssignmentDecidedPayload
      return p.reason
        ? `Atribuição rejeitada: ${p.reason}`
        : 'Uma atribuição foi rejeitada.'
    },
    deepLink: (raw) => {
      const p = raw as AssignmentDecidedPayload
      return shiftDeepLink({ scheduleId: p.scheduleId, shiftId: p.shiftId })
    },
  },
  TRANSFER_REQUESTED: {
    label: 'Transferência solicitada',
    Icon: RefreshCcw,
    category: 'yellow',
    copy: (raw, me) => {
      const p = raw as TransferRequestedPayload
      return p.targetUserId === me
        ? 'Pediram uma transferência de turno para você.'
        : 'Há uma nova solicitação de transferência para revisar.'
    },
    deepLink: () => '/requests/inbox',
  },
  TRANSFER_APPROVED: {
    label: 'Transferência aprovada',
    Icon: ThumbsUp,
    category: 'green',
    copy: () => 'Uma transferência foi aprovada.',
    deepLink: () => '/requests',
  },
  TRANSFER_REJECTED: {
    label: 'Transferência rejeitada',
    Icon: ThumbsDown,
    category: 'red',
    copy: () => 'Uma transferência foi rejeitada.',
    deepLink: () => '/requests',
  },
  CANDIDATE_QUEUED: {
    label: 'Candidato na fila',
    Icon: Users,
    category: 'blue',
    copy: (raw) => {
      const p = raw as CandidateQueuedPayload
      return `Novo candidato na fila (posição ${p.queuePosition}).`
    },
    deepLink: (raw) => {
      const p = raw as CandidateQueuedPayload
      return shiftDeepLink({ scheduleId: p.scheduleId, shiftId: p.shiftId })
    },
  },
  CANDIDATE_APPROVED: {
    label: 'Candidatura aprovada',
    Icon: ThumbsUp,
    category: 'green',
    copy: () => 'Sua candidatura foi aprovada.',
    deepLink: (raw) => {
      const p = raw as CandidateDecidedPayload
      return shiftDeepLink({ scheduleId: p.scheduleId, shiftId: p.shiftId })
    },
  },
  CANDIDATE_REJECTED: {
    label: 'Candidatura rejeitada',
    Icon: ThumbsDown,
    category: 'red',
    copy: (raw) => {
      const p = raw as CandidateDecidedPayload
      return p.reason
        ? `Candidatura rejeitada: ${p.reason}`
        : 'Sua candidatura foi rejeitada.'
    },
    deepLink: (raw) => {
      const p = raw as CandidateDecidedPayload
      return shiftDeepLink({ scheduleId: p.scheduleId, shiftId: p.shiftId })
    },
  },
  CANDIDATE_WITHDRAWN: {
    label: 'Candidatura retirada',
    Icon: UserMinus,
    category: 'gray',
    copy: () => 'Um candidato saiu da fila.',
    deepLink: (raw) => {
      const p = raw as CandidateWithdrawnPayload
      return `/schedules/${p.scheduleId}/shifts/${p.shiftId}`
    },
  },
  REQUEST_SUBMITTED: {
    label: 'Nova solicitação',
    Icon: Inbox,
    category: 'blue',
    copy: (raw, me) => {
      const p = raw as RequestSubmittedPayload
      const typeLabel =
        p.requestType === 'SWAP'
          ? 'troca'
          : p.requestType === 'OFFER'
            ? 'oferta'
            : 'folga'
      return p.requestType === 'SWAP' && p.requestedByUserId !== me
        ? `Pediram uma troca de turno com você.`
        : `Nova solicitação de ${typeLabel} para revisar.`
    },
    deepLink: (raw, me) => {
      const p = raw as RequestSubmittedPayload
      if (p.requestType === 'SWAP' && p.requestedByUserId !== me) {
        return '/requests'
      }
      return '/requests/inbox'
    },
  },
  REQUEST_RESOLVED: {
    label: 'Solicitação resolvida',
    Icon: Inbox,
    category: 'green',
    copy: (raw) => {
      const p = raw as RequestResolvedPayload
      const verbed = p.resolution === 'APPROVED' ? 'aprovada' : 'rejeitada'
      return p.resolutionReason
        ? `Solicitação ${verbed}: ${p.resolutionReason}`
        : `Sua solicitação foi ${verbed}.`
    },
    deepLink: () => '/requests',
  },
  REQUEST_PEER_DECISION: {
    label: 'Resposta do colega',
    Icon: Inbox,
    category: 'blue',
    copy: (raw) => {
      const p = raw as RequestPeerDecisionPayload
      return p.decision === 'ACCEPTED'
        ? 'Colega aceitou sua troca; aguardando aprovação do coordenador.'
        : 'Colega recusou sua troca.'
    },
    deepLink: () => '/requests',
  },
}

export const NOTIFICATION_META = META

export const FALLBACK_META: NotificationMeta = {
  label: 'Notificação',
  Icon: Bell,
  category: 'gray',
  copy: () => 'Você tem uma nova notificação.',
  deepLink: () => '/notifications',
}

export function getMetaFor(type: NotificationType): NotificationMeta {
  return NOTIFICATION_META[type] ?? FALLBACK_META
}

// Re-export icon used by clock-related future types if needed
export const CLOCK_ICON: LucideIcon = Clock4
export const CALENDAR_CLOCK_ICON: LucideIcon = CalendarClock
