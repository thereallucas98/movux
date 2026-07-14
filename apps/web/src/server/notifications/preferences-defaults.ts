import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'

/**
 * Per-channel default opt-in matrix. Used when a user has no stored row for
 * a (type, channel) pair — we fall back to these values rather than
 * pre-populating the table on user creation.
 *
 * `WHATSAPP: false` is intentional (LGPD-conservative); Phase 2 must require
 * explicit opt-in before any WhatsApp send.
 */
export const DEFAULT_ENABLED_BY_CHANNEL: Record<NotificationChannel, boolean> =
  {
    IN_APP: true,
    EMAIL: true,
    PUSH: true,
    WHATSAPP: false,
  }

export const ALL_CHANNELS: NotificationChannel[] = [
  'IN_APP',
  'EMAIL',
  'PUSH',
  'WHATSAPP',
]

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'SCHEDULE_PUBLISHED',
  'SCHEDULE_CLOSED',
  'SHIFT_CANCELLED',
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_REJECTED',
  'TRANSFER_REQUESTED',
  'TRANSFER_APPROVED',
  'TRANSFER_REJECTED',
  'CANDIDATE_QUEUED',
  'CANDIDATE_APPROVED',
  'CANDIDATE_REJECTED',
  'CANDIDATE_WITHDRAWN',
  'REQUEST_SUBMITTED',
  'REQUEST_RESOLVED',
  'REQUEST_PEER_DECISION',
]
