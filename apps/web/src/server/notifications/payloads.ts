import type { NotificationType } from '~/generated/prisma/client'

/**
 * Discriminated union for `Notification.payload`. Every payload carries the
 * minimal snapshot the F12 inbox needs to render a card without a follow-up
 * fetch — plus `entityType + entityId` so the deep-link can resolve current
 * state when the user clicks through.
 */

interface PayloadBase {
  entityType:
    | 'SCHEDULE'
    | 'SHIFT'
    | 'ASSIGNMENT'
    | 'CANDIDATE'
    | 'TRANSFER_REQUEST'
    | 'REQUEST'
  entityId: string
  actorUserId: string | null
}

export interface SchedulePublishedPayload extends PayloadBase {
  entityType: 'SCHEDULE'
  scheduleName: string | null
  categoryId: string
  periodStart: string
  periodEnd: string
}

export interface ScheduleClosedPayload extends PayloadBase {
  entityType: 'SCHEDULE'
  scheduleName: string | null
  closedEarly: boolean
}

export interface ShiftCancelledPayload extends PayloadBase {
  entityType: 'SHIFT'
  scheduleId: string
  shiftStartAt: string
  shiftEndAt: string
  reason: string | null
}

export interface AssignmentCreatedPayload extends PayloadBase {
  entityType: 'ASSIGNMENT'
  shiftId: string
  scheduleId: string
  shiftStartAt: string
  shiftEndAt: string
  categoryId: string
  decisionDeadline: string
  autoAccepted: boolean
}

export interface AssignmentDecidedPayload extends PayloadBase {
  entityType: 'ASSIGNMENT'
  shiftId: string
  scheduleId: string
  shiftStartAt: string
  shiftEndAt: string
  reason: string | null
}

export interface TransferRequestedPayload extends PayloadBase {
  entityType: 'TRANSFER_REQUEST'
  originalAssignmentId: string
  shiftId: string
  shiftStartAt: string
  shiftEndAt: string
  targetUserId: string
  requestedByUserId: string
}

export interface TransferDecidedPayload extends PayloadBase {
  entityType: 'TRANSFER_REQUEST'
  originalAssignmentId: string
  decision: 'APPROVE' | 'REJECT'
  decidedByUserId: string
}

export interface CandidateQueuedPayload extends PayloadBase {
  entityType: 'CANDIDATE'
  shiftId: string
  scheduleId: string
  shiftStartAt: string
  shiftEndAt: string
  candidateUserId: string
  queuePosition: number
}

export interface CandidateDecidedPayload extends PayloadBase {
  entityType: 'CANDIDATE'
  shiftId: string
  scheduleId: string
  shiftStartAt: string
  shiftEndAt: string
  reason: string | null
}

export interface CandidateWithdrawnPayload extends PayloadBase {
  entityType: 'CANDIDATE'
  shiftId: string
  scheduleId: string
  candidateUserId: string
}

export interface RequestSubmittedPayload extends PayloadBase {
  entityType: 'REQUEST'
  requestType: 'SWAP' | 'OFFER' | 'TIME_OFF'
  requestedByUserId: string
}

export interface RequestResolvedPayload extends PayloadBase {
  entityType: 'REQUEST'
  requestType: 'SWAP' | 'OFFER' | 'TIME_OFF'
  resolution: 'APPROVED' | 'REJECTED'
  resolvedByUserId: string
  resolutionReason: string | null
}

export interface RequestPeerDecisionPayload extends PayloadBase {
  entityType: 'REQUEST'
  requestType: 'SWAP'
  decision: 'ACCEPTED' | 'REJECTED'
  peerUserId: string
}

export type PayloadByType = {
  SCHEDULE_PUBLISHED: SchedulePublishedPayload
  SCHEDULE_CLOSED: ScheduleClosedPayload
  SHIFT_CANCELLED: ShiftCancelledPayload
  ASSIGNMENT_CREATED: AssignmentCreatedPayload
  ASSIGNMENT_ACCEPTED: AssignmentDecidedPayload
  ASSIGNMENT_REJECTED: AssignmentDecidedPayload
  TRANSFER_REQUESTED: TransferRequestedPayload
  TRANSFER_APPROVED: TransferDecidedPayload
  TRANSFER_REJECTED: TransferDecidedPayload
  CANDIDATE_QUEUED: CandidateQueuedPayload
  CANDIDATE_APPROVED: CandidateDecidedPayload
  CANDIDATE_REJECTED: CandidateDecidedPayload
  CANDIDATE_WITHDRAWN: CandidateWithdrawnPayload
  REQUEST_SUBMITTED: RequestSubmittedPayload
  REQUEST_RESOLVED: RequestResolvedPayload
  REQUEST_PEER_DECISION: RequestPeerDecisionPayload
}

export type PayloadFor<T extends NotificationType> = PayloadByType[T]

export type AnyNotificationPayload = PayloadByType[NotificationType]
