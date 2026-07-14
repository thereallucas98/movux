import {
  notificationPreferenceRepository,
  notificationRepository,
} from '~/server/repositories'
import { dispatch } from './dispatcher'
import type { ShiftCancelledPayload } from './payloads'

export interface ShiftCancelledEvent {
  shift: {
    id: string
    scheduleId: string
    workspaceId: string
    startAt: Date
    endAt: Date
  }
  reason: string | null
  actorUserId: string | null
  recipientUserIds: string[]
}

const deps = {
  notificationRepo: notificationRepository,
  notificationPreferenceRepo: notificationPreferenceRepository,
}

/**
 * Reserved for future `cancel-shift.use-case.ts`. The enum value
 * `SHIFT_CANCELLED` is already in the Prisma type taxonomy so the call site
 * can be added without a schema change.
 */
export async function notifyShiftCancelled(
  ev: ShiftCancelledEvent,
): Promise<void> {
  const payload: ShiftCancelledPayload = {
    entityType: 'SHIFT',
    entityId: ev.shift.id,
    actorUserId: ev.actorUserId,
    scheduleId: ev.shift.scheduleId,
    shiftStartAt: ev.shift.startAt.toISOString(),
    shiftEndAt: ev.shift.endAt.toISOString(),
    reason: ev.reason,
  }
  await dispatch(deps, {
    type: 'SHIFT_CANCELLED',
    payload,
    workspaceId: ev.shift.workspaceId,
    recipientUserIds: ev.recipientUserIds,
  })
}
