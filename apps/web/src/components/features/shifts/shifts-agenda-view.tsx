'use client'

import { formatInTimeZone } from 'date-fns-tz'
import * as React from 'react'

import { CalendarWeekGrid } from '~/components/ui/calendar-week-grid'
import { Skeleton } from '~/components/ui/skeleton'
import { periodDays } from '~/lib/date/period'
import type { CalendarView } from '~/lib/date/period'
import { cn } from '~/lib/utils'

import { ShiftRow } from './shift-row'
import type { ShiftRow as ShiftRowData } from './_hooks/use-shifts'
import type { ShiftCompositionItem } from './_hooks/use-shift-expected-composition'
import type { ScheduleStatus } from '~/components/features/schedules/schedule-status-tag'

interface Props {
  shifts: ShiftRowData[]
  cursor: string
  view: CalendarView
  timezone: string
  scheduleStatus: ScheduleStatus
  workspaceId: string
  scheduleId: string
  isAdmin: boolean
  canAssign: boolean
  canViewAssignments: boolean
  canViewCandidates: boolean
  compositionsByShiftId: Map<string, ShiftCompositionItem[]> | undefined
  specialtyNameById: Map<string, string>
  assignmentsByShiftId: Map<string, { status: string }[]> | undefined
  candidatesQueuedByShiftId: Map<string, number> | undefined
  isLoading: boolean
  onEdit: (shift: ShiftRowData) => void
  onEditComposition: (shift: ShiftRowData) => void
  onAssign: (shift: ShiftRowData) => void
  onViewAssignments: (shift: ShiftRowData) => void
  onViewCandidates: (shift: ShiftRowData) => void
}

const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  'ACCEPTED',
  'PENDING_CLOSURE',
  'COMPLETED',
])

export function ShiftsAgendaView({
  shifts,
  cursor,
  view,
  timezone,
  scheduleStatus,
  workspaceId,
  scheduleId,
  isAdmin,
  canAssign,
  canViewAssignments,

  canViewCandidates,
  compositionsByShiftId,
  specialtyNameById,
  assignmentsByShiftId,
  candidatesQueuedByShiftId,
  isLoading,
  onEdit,
  onEditComposition,
  onAssign,
  onViewAssignments,
  onViewCandidates,
}: Props) {
  const days = periodDays(cursor, view, timezone)

  function summaryFor(shiftId: string) {
    const list = assignmentsByShiftId?.get(shiftId) ?? []
    let active = 0
    let pending = 0
    for (const a of list) {
      if (a.status === 'PENDING_ACCEPT') pending += 1
      else if (ACTIVE_ASSIGNMENT_STATUSES.has(a.status)) active += 1
    }
    return { active, pending, total: active + pending }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <CalendarWeekGrid
      days={days}
      timezone={timezone}
      renderDay={(day) => {
        const dayKey = formatInTimeZone(day, timezone, 'yyyy-MM-dd')
        const dayShifts = shifts.filter(
          (s) =>
            formatInTimeZone(new Date(s.startAt), timezone, 'yyyy-MM-dd') ===
            dayKey,
        )
        if (dayShifts.length === 0) {
          return (
            <p className={cn('text-muted-foreground py-4 text-center text-sm')}>
              Nenhum turno
            </p>
          )
        }
        return (
          <ul className="flex flex-col gap-2">
            {dayShifts.map((s) => (
              <ShiftRow
                key={s.id}
                workspaceId={workspaceId}
                scheduleId={scheduleId}
                workspaceTimezone={timezone}
                shift={s}
                scheduleStatus={scheduleStatus}
                isAdmin={isAdmin}
                variant="compact"
                onEdit={onEdit}
                composition={compositionsByShiftId?.get(s.id) ?? []}
                specialtyNameById={specialtyNameById}
                onEditComposition={onEditComposition}
                assignmentSummary={summaryFor(s.id)}
                canAssign={canAssign}
                canViewAssignments={canViewAssignments}
                onAssign={onAssign}
                onViewAssignments={onViewAssignments}
                canViewCandidates={canViewCandidates}
                candidatesQueuedCount={
                  candidatesQueuedByShiftId?.get(s.id) ?? 0
                }
                onViewCandidates={onViewCandidates}
              />
            ))}
          </ul>
        )
      }}
    />
  )
}
