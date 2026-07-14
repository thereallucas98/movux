import {
  notificationPreferenceRepository,
  notificationRepository,
} from '~/server/repositories'
import { dispatch } from './dispatcher'
import type {
  TransferDecidedPayload,
  TransferRequestedPayload,
} from './payloads'

export interface TransferRequestedEvent {
  transferRequestId: string
  originalAssignmentId: string
  shiftId: string
  shiftStartAt: Date
  shiftEndAt: Date
  workspaceId: string
  targetUserId: string
  requestedByUserId: string
  recipientUserIds: string[]
}

export interface TransferDecidedEvent {
  transferRequestId: string
  originalAssignmentId: string
  workspaceId: string
  decision: 'APPROVE' | 'REJECT'
  decidedByUserId: string
  recipientUserIds: string[]
}

const deps = {
  notificationRepo: notificationRepository,
  notificationPreferenceRepo: notificationPreferenceRepository,
}

export async function notifyTransferRequested(
  ev: TransferRequestedEvent,
): Promise<void> {
  const payload: TransferRequestedPayload = {
    entityType: 'TRANSFER_REQUEST',
    entityId: ev.transferRequestId,
    actorUserId: ev.requestedByUserId,
    originalAssignmentId: ev.originalAssignmentId,
    shiftId: ev.shiftId,
    shiftStartAt: ev.shiftStartAt.toISOString(),
    shiftEndAt: ev.shiftEndAt.toISOString(),
    targetUserId: ev.targetUserId,
    requestedByUserId: ev.requestedByUserId,
  }
  await dispatch(deps, {
    type: 'TRANSFER_REQUESTED',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyTransferDecided(
  ev: TransferDecidedEvent,
): Promise<void> {
  const payload: TransferDecidedPayload = {
    entityType: 'TRANSFER_REQUEST',
    entityId: ev.transferRequestId,
    actorUserId: ev.decidedByUserId,
    originalAssignmentId: ev.originalAssignmentId,
    decision: ev.decision,
    decidedByUserId: ev.decidedByUserId,
  }
  await dispatch(deps, {
    type: ev.decision === 'APPROVE' ? 'TRANSFER_APPROVED' : 'TRANSFER_REJECTED',
    payload,
    workspaceId: ev.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}
