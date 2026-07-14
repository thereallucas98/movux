import {
  notificationPreferenceRepository,
  notificationRepository,
} from '~/server/repositories'
import { dispatch } from './dispatcher'
import type {
  CandidateDecidedPayload,
  CandidateQueuedPayload,
  CandidateWithdrawnPayload,
} from './payloads'

export interface CandidateQueuedEvent {
  candidateId: string
  shiftId: string
  scheduleId: string
  workspaceId: string
  shiftStartAt: Date
  shiftEndAt: Date
  candidateUserId: string
  queuePosition: number
  recipientUserIds: string[]
}

export interface CandidateDecidedEvent {
  candidateId: string
  shiftId: string
  scheduleId: string
  workspaceId: string
  shiftStartAt: Date
  shiftEndAt: Date
  decidedByUserId: string
  reason: string | null
  recipientUserIds: string[]
}

export interface CandidateWithdrawnEvent {
  candidateId: string
  shiftId: string
  scheduleId: string
  workspaceId: string
  candidateUserId: string
  recipientUserIds: string[]
}

const deps = {
  notificationRepo: notificationRepository,
  notificationPreferenceRepo: notificationPreferenceRepository,
}

export async function notifyCandidateQueued(
  ev: CandidateQueuedEvent,
): Promise<void> {
  const payload: CandidateQueuedPayload = {
    entityType: 'CANDIDATE',
    entityId: ev.candidateId,
    actorUserId: ev.candidateUserId,
    shiftId: ev.shiftId,
    scheduleId: ev.scheduleId,
    shiftStartAt: ev.shiftStartAt.toISOString(),
    shiftEndAt: ev.shiftEndAt.toISOString(),
    candidateUserId: ev.candidateUserId,
    queuePosition: ev.queuePosition,
  }
  await dispatch(deps, {
    type: 'CANDIDATE_QUEUED',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyCandidateApproved(
  ev: CandidateDecidedEvent,
): Promise<void> {
  const payload: CandidateDecidedPayload = {
    entityType: 'CANDIDATE',
    entityId: ev.candidateId,
    actorUserId: ev.decidedByUserId,
    shiftId: ev.shiftId,
    scheduleId: ev.scheduleId,
    shiftStartAt: ev.shiftStartAt.toISOString(),
    shiftEndAt: ev.shiftEndAt.toISOString(),
    reason: ev.reason,
  }
  await dispatch(deps, {
    type: 'CANDIDATE_APPROVED',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyCandidateRejected(
  ev: CandidateDecidedEvent,
): Promise<void> {
  const payload: CandidateDecidedPayload = {
    entityType: 'CANDIDATE',
    entityId: ev.candidateId,
    actorUserId: ev.decidedByUserId,
    shiftId: ev.shiftId,
    scheduleId: ev.scheduleId,
    shiftStartAt: ev.shiftStartAt.toISOString(),
    shiftEndAt: ev.shiftEndAt.toISOString(),
    reason: ev.reason,
  }
  await dispatch(deps, {
    type: 'CANDIDATE_REJECTED',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyCandidateWithdrawn(
  ev: CandidateWithdrawnEvent,
): Promise<void> {
  const payload: CandidateWithdrawnPayload = {
    entityType: 'CANDIDATE',
    entityId: ev.candidateId,
    actorUserId: ev.candidateUserId,
    shiftId: ev.shiftId,
    scheduleId: ev.scheduleId,
    candidateUserId: ev.candidateUserId,
  }
  await dispatch(deps, {
    type: 'CANDIDATE_WITHDRAWN',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}
