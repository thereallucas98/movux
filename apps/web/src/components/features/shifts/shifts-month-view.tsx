'use client'

import { formatInTimeZone } from 'date-fns-tz'
import * as React from 'react'

import { CalendarMonthGrid } from '~/components/ui/calendar-month-grid'
import { Skeleton } from '~/components/ui/skeleton'
import { calendarDays } from '~/lib/date/period'
import { categoryVisual } from '~/lib/format/category-visual'
import { cn } from '~/lib/utils'

import type { ShiftRow } from './_hooks/use-shifts'

interface Props {
  shifts: ShiftRow[]
  cursor: string
  timezone: string
  isLoading: boolean
  onCursorChange: (cursor: string) => void
  onViewChange: (view: 'week') => void
}

const MAX_CHIPS = 3

export function ShiftsMonthView({
  shifts,
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

  function shiftsByDay(day: Date) {
    const key = dayKey(day)
    return shifts.filter(
      (s) =>
        formatInTimeZone(new Date(s.startAt), timezone, 'yyyy-MM-dd') === key,
    )
  }

  function handleChipClick(day: Date) {
    onCursorChange(dayKey(day))
    onViewChange('week')
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
        const dayShifts = shiftsByDay(day)
        const visible = dayShifts.slice(0, MAX_CHIPS)
        const overflow = dayShifts.length - MAX_CHIPS

        return (
          <div className="flex flex-col gap-0.5">
            {visible.map((s) => {
              const visual = categoryVisual(s.categoryId)
              const start = formatInTimeZone(
                new Date(s.startAt),
                timezone,
                'HH:mm',
              )
              const end = formatInTimeZone(new Date(s.endAt), timezone, 'HH:mm')
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleChipClick(day)}
                  className={cn(
                    'w-full truncate rounded py-0.5 pr-1 pl-1.5 text-left text-[11px] leading-snug transition-opacity hover:opacity-75',
                    visual.chipClass,
                  )}
                >
                  <span className="font-semibold tabular-nums">
                    {start}–{end}
                  </span>
                  <span className="ml-1 opacity-70">{s.headcount}v</span>
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
