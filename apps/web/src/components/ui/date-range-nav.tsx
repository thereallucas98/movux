'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '~/lib/utils'
import { advancePeriod, periodLabel } from '~/lib/date/period'
import type { CalendarView } from '~/lib/date/period'
import { IconButton } from './icon-button'

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Calendário',
  week: 'Semana',
  day: 'Dia',
  table: 'Tabela',
}

export interface DateRangeNavProps {
  view: CalendarView
  cursor: string
  timezone: string
  views?: CalendarView[]
  onViewChange: (v: CalendarView) => void
  onCursorChange: (c: string) => void
  className?: string
}

export function DateRangeNav({
  view,
  cursor,
  timezone,
  views = ['month', 'table'],
  onViewChange,
  onCursorChange,
  className,
}: DateRangeNavProps) {
  const label = periodLabel(cursor, view, timezone)

  function handlePrev() {
    if (view === 'table') return
    onCursorChange(advancePeriod(cursor, view, -1))
  }

  function handleNext() {
    if (view === 'table') return
    onCursorChange(advancePeriod(cursor, view, 1))
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {/* View tabs */}
      <div className="bg-muted flex gap-1 rounded-lg p-1">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => onViewChange(v)}
            className={cn(
              'focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              view === v
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Navigation row */}
      <div className="flex items-center gap-2">
        <IconButton
          aria-label="Período anterior"
          size="sm"
          onClick={handlePrev}
          disabled={view === 'table'}
        >
          <ChevronLeftIcon />
        </IconButton>
        <span className="min-w-36 text-center text-sm font-medium tabular-nums">
          {label}
        </span>
        <IconButton
          aria-label="Próximo período"
          size="sm"
          onClick={handleNext}
          disabled={view === 'table'}
        >
          <ChevronRightIcon />
        </IconButton>
      </div>
    </div>
  )
}
