'use client'

import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import * as React from 'react'

import { cn } from '~/lib/utils'

const WEEKDAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

export interface CalendarMonthGridProps {
  /** Noon-UTC Date objects from `calendarDays()`. */
  days: Date[]
  /** YYYY-MM prefix of the displayed month, e.g. "2026-05". */
  referenceMonthStr: string
  timezone: string
  renderCell: (day: Date) => React.ReactNode
  className?: string
}

export function CalendarMonthGrid({
  days,
  referenceMonthStr,
  timezone,
  renderCell,
  className,
}: CalendarMonthGridProps) {
  const todayStr = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')

  return (
    <div
      role="grid"
      aria-label="Grade mensal"
      className={cn('bg-border overflow-hidden rounded-xl', className)}
    >
      {/* Weekday headers */}
      <div className="bg-border grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            role="columnheader"
            className="bg-muted text-muted-foreground px-2 py-1.5 text-center text-xs font-medium"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="bg-border grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dayStr = formatInTimeZone(day, timezone, 'yyyy-MM-dd')
          const inMonth = dayStr.startsWith(referenceMonthStr)
          const isToday = dayStr === todayStr
          return (
            <div
              key={dayStr}
              role="gridcell"
              className={cn(
                'bg-background min-h-24 p-1',
                !inMonth && 'bg-muted/30',
                isToday && 'ring-primary ring-1 ring-inset',
              )}
            >
              <span
                className={cn(
                  'mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  isToday
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground',
                  !inMonth && 'opacity-40',
                )}
              >
                {formatInTimeZone(day, timezone, 'd', { locale: ptBR })}
              </span>
              {renderCell(day)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
