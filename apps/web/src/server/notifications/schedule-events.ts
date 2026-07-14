/**
 * Schedule notification events (Task 16).
 *
 * Each `notify*` is a thin wrapper around `dispatch` that the use-case calls
 * fire-and-forget AFTER its `prisma.$transaction` commits — a notification
 * failure must NEVER roll back state.
 */

import {
  notificationPreferenceRepository,
  notificationRepository,
} from '~/server/repositories'
import { dispatch } from './dispatcher'
import type {
  ScheduleClosedPayload,
  SchedulePublishedPayload,
} from './payloads'

export interface SchedulePublishedEvent {
  schedule: {
    id: string
    workspaceId: string
    categoryId: string
    name: string | null
    periodStart: Date
    periodEnd: Date
  }
  actorUserId: string | null
  recipientUserIds: string[]
}

export interface ScheduleClosedEvent {
  schedule: {
    id: string
    workspaceId: string
    name: string | null
  }
  closedEarly: boolean
  actorUserId: string | null
  recipientUserIds: string[]
}

const deps = {
  notificationRepo: notificationRepository,
  notificationPreferenceRepo: notificationPreferenceRepository,
}

export async function notifySchedulePublished(
  ev: SchedulePublishedEvent,
): Promise<void> {
  const payload: SchedulePublishedPayload = {
    entityType: 'SCHEDULE',
    entityId: ev.schedule.id,
    actorUserId: ev.actorUserId,
    scheduleName: ev.schedule.name,
    categoryId: ev.schedule.categoryId,
    periodStart: ev.schedule.periodStart.toISOString(),
    periodEnd: ev.schedule.periodEnd.toISOString(),
  }
  await dispatch(deps, {
    type: 'SCHEDULE_PUBLISHED',
    payload,
    workspaceId: ev.schedule.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}

export async function notifyScheduleClosed(
  ev: ScheduleClosedEvent,
): Promise<void> {
  const payload: ScheduleClosedPayload = {
    entityType: 'SCHEDULE',
    entityId: ev.schedule.id,
    actorUserId: ev.actorUserId,
    scheduleName: ev.schedule.name,
    closedEarly: ev.closedEarly,
  }
  await dispatch(deps, {
    type: 'SCHEDULE_CLOSED',
    payload,
    workspaceId: ev.schedule.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}
