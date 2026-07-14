'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { DateRangeNav } from '~/components/ui/date-range-nav'
import { periodBounds } from '~/lib/date/period'
import type { CalendarView } from '~/lib/date/period'
import { cn } from '~/lib/utils'
import type { AssignmentStatus } from '~/components/features/assignments/assignment-status-tag'

import { useMyAssignments } from './_hooks/use-my-assignments'
import { useMyAssignmentsForPeriod } from './_hooks/use-my-assignments-for-period'
import { MyShiftsMonthView } from './my-shifts-month-view'
import { MyShiftsTableView } from './my-shifts-table-view'

const TIMEZONE = 'America/Sao_Paulo'

type FilterKey = 'all' | 'pending' | 'accepted' | 'history'

const STATUS_MAP: Record<FilterKey, AssignmentStatus[]> = {
  all: [
    'PENDING_ACCEPT',
    'ACCEPTED',
    'PENDING_CLOSURE',
    'COMPLETED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED',
    'TRANSFERRED',
  ],
  pending: ['PENDING_ACCEPT'],
  accepted: ['ACCEPTED', 'PENDING_CLOSURE'],
  history: ['REJECTED', 'EXPIRED', 'CANCELLED', 'TRANSFERRED', 'COMPLETED'],
}

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'Todos',
  pending: 'Pendente',
  accepted: 'Aceito',
  history: 'Histórico',
}

const FILTER_KEYS: FilterKey[] = ['all', 'pending', 'accepted', 'history']

const EMPTY_TEXT: Record<FilterKey, string> = {
  all: 'Você não tem turnos ainda.',
  pending: 'Nenhum turno pendente.',
  accepted: 'Nenhum turno aceito ativo.',
  history: 'Sem histórico ainda.',
}

function filterToCardVariant(
  filter: FilterKey,
): 'pending' | 'accepted' | 'history' {
  if (filter === 'pending') return 'pending'
  if (filter === 'accepted') return 'accepted'
  return 'history'
}

const VALID_VIEWS = new Set<CalendarView>(['month', 'week', 'day', 'table'])
const VALID_FILTERS = new Set<FilterKey>(FILTER_KEYS)

export function MyShiftsList() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawView = searchParams.get('view') ?? 'month'
  const view: CalendarView = VALID_VIEWS.has(rawView as CalendarView)
    ? (rawView as CalendarView)
    : 'month'

  const rawFilter = searchParams.get('filter') ?? 'all'
  const filter: FilterKey = VALID_FILTERS.has(rawFilter as FilterKey)
    ? (rawFilter as FilterKey)
    : 'all'

  const today = new Date().toISOString().slice(0, 10)
  const cursor = searchParams.get('cursor') ?? today

  const statuses = STATUS_MAP[filter]

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const period = view !== 'table' ? periodBounds(cursor, view, TIMEZONE) : null

  const tableQuery = useMyAssignments(statuses)
  const periodQuery = useMyAssignmentsForPeriod(statuses, period)

  const cardVariant = filterToCardVariant(filter)

  const calendarItems = periodQuery.data ?? []
  const tableItems = tableQuery.data ?? []

  return (
    <section
      aria-labelledby="my-shifts-heading"
      className="flex flex-col gap-4"
    >
      <h2
        id="my-shifts-heading"
        className="text-foreground text-[20px] font-semibold"
      >
        Meus Turnos
      </h2>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setParam('filter', key)}
            className={cn(
              'focus-visible:ring-ring rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {FILTER_LABELS[key]}
          </button>
        ))}
      </div>

      <DateRangeNav
        view={view}
        cursor={cursor}
        timezone={TIMEZONE}
        onViewChange={(v) => setParam('view', v)}
        onCursorChange={(c) => setParam('cursor', c)}
      />

      {view === 'month' && (
        <MyShiftsMonthView
          assignments={calendarItems}
          cursor={cursor}
          timezone={TIMEZONE}
          isLoading={periodQuery.isLoading}
          onCursorChange={(c) => setParam('cursor', c)}
          onViewChange={(v) => setParam('view', v)}
        />
      )}

      {view === 'table' && (
        <MyShiftsTableView
          items={tableItems}
          isLoading={tableQuery.isLoading}
          emptyText={EMPTY_TEXT[filter]}
          cardVariant={cardVariant}
        />
      )}
    </section>
  )
}
