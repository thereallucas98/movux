import { builder } from '../builder'

export const NotificationTypeEnum = builder.enumType('NotificationType', {
  values: [
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
  ] as const,
})

export const NotificationChannelEnum = builder.enumType('NotificationChannel', {
  values: ['IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP'] as const,
})
