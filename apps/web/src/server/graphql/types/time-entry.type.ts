import type { TimeEntryRow } from '~/server/repositories/time-entry.repository'
import { builder } from '../builder'
import { TimeEntryStatusEnum } from '../enums/time-entry.enum'

export interface ClockLocationPayload {
  lat: number
  lng: number
}

const ClockLocationType = builder.simpleObject('ClockLocation', {
  fields: (t) => ({
    lat: t.float(),
    lng: t.float(),
  }),
})

export type TimeEntryStatus = 'OPEN' | 'CLOCKED_OUT' | 'CLOSED'

export interface TimeEntryPayload {
  id: string
  shiftAssignmentId: string
  userId: string
  clockInAt: Date
  clockInLocation: ClockLocationPayload | null
  clockInWithinTolerance: boolean
  clockOutAt: Date | null
  clockOutLocation: ClockLocationPayload | null
  clockOutWithinTolerance: boolean | null
  overtimeMinutes: number
  closedByUserId: string | null
  closedAt: Date | null
  notes: string | null
  status: TimeEntryStatus
  createdAt: Date
  updatedAt: Date
}

export const TimeEntryType = builder.simpleObject('TimeEntry', {
  fields: (t) => ({
    id: t.id(),
    shiftAssignmentId: t.id(),
    userId: t.id(),
    clockInAt: t.field({ type: 'DateTime' }),
    clockInLocation: t.field({ type: ClockLocationType, nullable: true }),
    clockInWithinTolerance: t.boolean(),
    clockOutAt: t.field({ type: 'DateTime', nullable: true }),
    clockOutLocation: t.field({ type: ClockLocationType, nullable: true }),
    clockOutWithinTolerance: t.boolean({ nullable: true }),
    overtimeMinutes: t.int(),
    closedByUserId: t.id({ nullable: true }),
    closedAt: t.field({ type: 'DateTime', nullable: true }),
    notes: t.string({ nullable: true }),
    status: t.field({ type: TimeEntryStatusEnum }),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

export function toTimeEntryPayload(row: TimeEntryRow): TimeEntryPayload {
  let status: TimeEntryStatus = 'OPEN'
  if (row.closedAt) status = 'CLOSED'
  else if (row.clockOutAt) status = 'CLOCKED_OUT'

  return {
    id: row.id,
    shiftAssignmentId: row.shiftAssignmentId,
    userId: row.userId,
    clockInAt: row.clockInAt,
    clockInLocation: row.clockInLocation,
    clockInWithinTolerance: row.clockInWithinTolerance,
    clockOutAt: row.clockOutAt,
    clockOutLocation: row.clockOutLocation,
    clockOutWithinTolerance: row.clockOutWithinTolerance,
    overtimeMinutes: row.overtimeMinutes,
    closedByUserId: row.closedByUserId,
    closedAt: row.closedAt,
    notes: row.notes,
    status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
