'use client'

import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import * as React from 'react'

import { cn } from '~/lib/utils'

export interface CalendarWeekGridProps {
  days: Date[]
  timezone: string
  renderDay: (day: Date) => React.ReactNode
  className?: string
}

export function CalendarWeekGrid({
  days,
  timezone,
  renderDay,
  className,
}: CalendarWeekGridProps) {
  const todayStr = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')

  return (
    <div
      className={cn(
        'bg-border flex flex-col gap-0 overflow-hidden rounded-xl border md:grid md:gap-px',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((day) => {
        const dayStr = formatInTimeZone(day, timezone, 'yyyy-MM-dd')
        const today = dayStr === todayStr
        return (
          <div key={dayStr} className="bg-background flex flex-col">
            {/* Column header */}
            <div
              className={cn(
                'flex items-center gap-1.5 border-b px-3 py-2',
                today && 'bg-primary/5',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                  today
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground',
                )}
              >
                {formatInTimeZone(day, timezone, 'd', { locale: ptBR })}
              </span>
              <span
                className={cn(
                  'text-xs tracking-wide uppercase',
                  today ? 'text-primary font-medium' : 'text-muted-foreground',
                )}
              >
                {formatInTimeZone(day, timezone, 'EEE', { locale: ptBR })}
              </span>
            </div>

            {/* Day content */}
            <div className="flex-1 p-2">{renderDay(day)}</div>
          </div>
        )
      })}
    </div>
  )
}
