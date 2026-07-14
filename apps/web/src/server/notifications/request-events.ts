import {
  notificationPreferenceRepository,
  notificationRepository,
} from '~/server/repositories'
import { dispatch } from './dispatcher'
import type {
  RequestPeerDecisionPayload,
  RequestResolvedPayload,
  RequestSubmittedPayload,
} from './payloads'

export interface RequestSubmittedEvent {
  requestId: string
  workspaceId: string
  requestType: 'SWAP' | 'OFFER' | 'TIME_OFF'
  requestedByUserId: string
  recipientUserIds: string[]
}

export interface RequestResolvedEvent {
  requestId: string
  workspaceId: string
  requestType: 'SWAP' | 'OFFER' | 'TIME_OFF'
  resolvedByUserId: string
  resolution: 'APPROVED' | 'REJECTED'
  resolutionReason: string | null
  recipientUserIds: string[]
}

export interface RequestPeerDecisionEvent {
  requestId: string
  workspaceId: string
  peerUserId: string
  decision: 'ACCEPTED' | 'REJECTED'
  recipientUserIds: string[]
}

const deps = {
  notificationRepo: notificationRepository,
  notificationPreferenceRepo: notificationPreferenceRepository,
}

export async function notifyRequestSubmitted(
  ev: RequestSubmittedEvent,
): Promise<void> {
  const payload: RequestSubmittedPayload = {
    entityType: 'REQUEST',
    entityId: ev.requestId,
    actorUserId: ev.requestedByUserId,
    requestType: ev.requestType,
    requestedByUserId: ev.requestedByUserId,
  }
  await dispatch(deps, {
    type: 'REQUEST_SUBMITTED',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyRequestResolved(
  ev: RequestResolvedEvent,
): Promise<void> {
  const payload: RequestResolvedPayload = {
    entityType: 'REQUEST',
    entityId: ev.requestId,
    actorUserId: ev.resolvedByUserId,
    requestType: ev.requestType,
    resolution: ev.resolution,
    resolvedByUserId: ev.resolvedByUserId,
    resolutionReason: ev.resolutionReason,
  }
  await dispatch(deps, {
    type: 'REQUEST_RESOLVED',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyRequestPeerDecision(
  ev: RequestPeerDecisionEvent,
): Promise<void> {
  const payload: RequestPeerDecisionPayload = {
    entityType: 'REQUEST',
    entityId: ev.requestId,
    actorUserId: ev.peerUserId,
    requestType: 'SWAP',
    decision: ev.decision,
    peerUserId: ev.peerUserId,
  }
  await dispatch(deps, {
    type: 'REQUEST_PEER_DECISION',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}
