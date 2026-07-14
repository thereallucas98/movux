import {
  notificationPreferenceRepository,
  notificationRepository,
} from '~/server/repositories'
import { dispatch } from './dispatcher'
import type {
  AssignmentCreatedPayload,
  AssignmentDecidedPayload,
} from './payloads'

export interface AssignmentCreatedEvent {
  assignment: {
    id: string
    shiftId: string
    scheduleId: string
    categoryId: string
    workspaceId: string
    userId: string
    decisionDeadline: Date
    autoAccepted: boolean
    shiftStartAt: Date
    shiftEndAt: Date
  }
  actorUserId: string | null
  recipientUserIds: string[]
}

export interface AssignmentDecidedEvent {
  assignment: {
    id: string
    shiftId: string
    scheduleId: string
    workspaceId: string
    shiftStartAt: Date
    shiftEndAt: Date
  }
  reason: string | null
  actorUserId: string | null
  recipientUserIds: string[]
}

const deps = {
  notificationRepo: notificationRepository,
  notificationPreferenceRepo: notificationPreferenceRepository,
}

export async function notifyAssignmentCreated(
  ev: AssignmentCreatedEvent,
): Promise<void> {
  const payload: AssignmentCreatedPayload = {
    entityType: 'ASSIGNMENT',
    entityId: ev.assignment.id,
    actorUserId: ev.actorUserId,
    shiftId: ev.assignment.shiftId,
    scheduleId: ev.assignment.scheduleId,
    shiftStartAt: ev.assignment.shiftStartAt.toISOString(),
    shiftEndAt: ev.assignment.shiftEndAt.toISOString(),
    categoryId: ev.assignment.categoryId,
    decisionDeadline: ev.assignment.decisionDeadline.toISOString(),
    autoAccepted: ev.assignment.autoAccepted,
  }
  await dispatch(deps, {
    type: 'ASSIGNMENT_CREATED',
    payload,
    workspaceId: ev.assignment.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyAssignmentAccepted(
  ev: AssignmentDecidedEvent,
): Promise<void> {
  const payload: AssignmentDecidedPayload = {
    entityType: 'ASSIGNMENT',
    entityId: ev.assignment.id,
    actorUserId: ev.actorUserId,
    shiftId: ev.assignment.shiftId,
    scheduleId: ev.assignment.scheduleId,
    shiftStartAt: ev.assignment.shiftStartAt.toISOString(),
    shiftEndAt: ev.assignment.shiftEndAt.toISOString(),
    reason: ev.reason,
  }
  await dispatch(deps, {
    type: 'ASSIGNMENT_ACCEPTED',
    payload,
    workspaceId: ev.assignment.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyAssignmentRejected(
  ev: AssignmentDecidedEvent,
): Promise<void> {
  const payload: AssignmentDecidedPayload = {
    entityType: 'ASSIGNMENT',
    entityId: ev.assignment.id,
    actorUserId: ev.actorUserId,
    shiftId: ev.assignment.shiftId,
    scheduleId: ev.assignment.scheduleId,
    shiftStartAt: ev.assignment.shiftStartAt.toISOString(),
    shiftEndAt: ev.assignment.shiftEndAt.toISOString(),
    reason: ev.reason,
  }
  await dispatch(deps, {
    type: 'ASSIGNMENT_REJECTED',
    payload,
    workspaceId: ev.assignment.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}
