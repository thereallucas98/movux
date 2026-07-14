'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import * as React from 'react'

import { CalendarMonthGrid } from '~/components/ui/calendar-month-grid'
import { Skeleton } from '~/components/ui/skeleton'
import { calendarDays } from '~/lib/date/period'
import { cn } from '~/lib/utils'

import type { MyAssignmentRow } from './_hooks/use-my-assignments'
import type { AssignmentStatus } from '~/components/features/assignments/assignment-status-tag'

interface Props {
  assignments: MyAssignmentRow[]
  cursor: string
  timezone: string
  isLoading: boolean
  onCursorChange: (cursor: string) => void
  onViewChange: (view: 'day') => void
}

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  PENDING_ACCEPT: 'bg-amber-100 border-l-2 border-l-amber-500 text-amber-800',
  ACCEPTED: 'bg-blue-100 border-l-2 border-l-blue-500 text-blue-800',
  PENDING_CLOSURE: 'bg-blue-100 border-l-2 border-l-blue-500 text-blue-800',
  COMPLETED: 'bg-green-100 border-l-2 border-l-green-500 text-green-800',
  REJECTED:
    'bg-muted border-l-2 border-l-muted-foreground/40 text-muted-foreground',
  EXPIRED:
    'bg-muted border-l-2 border-l-muted-foreground/40 text-muted-foreground',
  CANCELLED:
    'bg-muted border-l-2 border-l-muted-foreground/40 text-muted-foreground',
  TRANSFERRED:
    'bg-muted border-l-2 border-l-muted-foreground/40 text-muted-foreground',
}

const MAX_CHIPS = 3

export function MyShiftsMonthView({
  assignments,
  cursor,
  timezone,
  isLoading,
  onCursorChange,
  onViewChange,
}: Props) {
  const days = calendarDays(cursor, timezone)
  const referenceMonthStr = formatInTimeZone(
    new Date(cursor + 'T12:00:00Z'),
    timezone,
    'yyyy-MM',
  )

  function dayKey(date: Date): string {
    return formatInTimeZone(date, timezone, 'yyyy-MM-dd')
  }

  function assignmentsByDay(day: Date) {
    const key = dayKey(day)
    return assignments.filter(
      (a) =>
        formatInTimeZone(new Date(a.shift.startAt), timezone, 'yyyy-MM-dd') ===
        key,
    )
  }

  function handleChipClick(day: Date) {
    onCursorChange(dayKey(day))
    onViewChange('day')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <CalendarMonthGrid
      days={days}
      referenceMonthStr={referenceMonthStr}
      timezone={timezone}
      renderCell={(day) => {
        const dayAssignments = assignmentsByDay(day)
        const visible = dayAssignments.slice(0, MAX_CHIPS)
        const overflow = dayAssignments.length - MAX_CHIPS

        return (
          <div className="flex flex-col gap-0.5">
            {visible.map((a) => {
              const startTime = formatInTimeZone(
                new Date(a.shift.startAt),
                timezone,
                'HH:mm',
                { locale: ptBR },
              )
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleChipClick(day)}
                  className={cn(
                    'w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-opacity hover:opacity-80',
                    STATUS_CLASS[a.status],
                  )}
                >
                  {startTime}
                </button>
              )
            })}
            {overflow > 0 && (
              <button
                type="button"
                onClick={() => handleChipClick(day)}
                className="text-primary text-left text-[10px] hover:underline"
              >
                +{overflow} mais
              </button>
            )}
          </div>
        )
      }}
    />
  )
}
