'use client'

import { formatInTimeZone } from 'date-fns-tz'
import * as React from 'react'

import { CalendarWeekGrid } from '~/components/ui/calendar-week-grid'
import { Skeleton } from '~/components/ui/skeleton'
import { periodDays } from '~/lib/date/period'
import type { CalendarView } from '~/lib/date/period'

import type { MyAssignmentRow } from './_hooks/use-my-assignments'
import { MyShiftCard } from './my-shift-card'

interface Props {
  assignments: MyAssignmentRow[]
  cursor: string
  view: CalendarView
  timezone: string
  isLoading: boolean
  cardVariant: 'pending' | 'accepted' | 'history'
}

export function MyShiftsAgendaView({
  assignments,
  cursor,
  view,
  timezone,
  isLoading,
  cardVariant,
}: Props) {
  const days = periodDays(cursor, view, timezone)

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
        const dayAssignments = assignments.filter(
          (a) =>
            formatInTimeZone(
              new Date(a.shift.startAt),
              timezone,
              'yyyy-MM-dd',
            ) === dayKey,
        )
        if (dayAssignments.length === 0) {
          return (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Nenhum turno
            </p>
          )
        }
        return (
          <ul className="flex flex-col gap-2">
            {dayAssignments.map((a) => (
              <li key={a.id}>
                <MyShiftCard assignment={a} variant={cardVariant} />
              </li>
            ))}
          </ul>
        )
      }}
    />
  )
}
