'use client'

import { ChevronDown, Filter, X } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '~/components/ui/button'
import { DateRangePicker } from '~/components/ui/date-range-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { cn } from '~/lib/utils'

import type { ScheduleStatus } from './schedule-status-tag'
import type { ListFilters } from './_hooks/use-schedules'

const ALL = '__all__'

interface Props {
  workspaceId: string
  filters: ListFilters
  onChange: (next: ListFilters) => void
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicada',
  CLOSED: 'Encerrada',
}

function isoFromDate(d: Date | undefined | null): string | undefined {
  if (!d) return undefined
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromIso(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function SchedulesFilterBar({ workspaceId, filters, onChange }: Props) {
  const categoriesQuery = useTaxonomies('categories', workspaceId)
  const categories = categoriesQuery.data ?? []
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeCount =
    (filters.status ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0)

  function setStatus(value: string) {
    onChange({
      ...filters,
      status: value === ALL ? undefined : (value as ScheduleStatus),
    })
  }
  function setCategory(value: string) {
    onChange({
      ...filters,
      categoryId: value === ALL ? undefined : value,
    })
  }
  function setRange(range: DateRange | undefined) {
    onChange({
      ...filters,
      from: isoFromDate(range?.from),
      to: isoFromDate(range?.to),
    })
  }
  function clearAll() {
    onChange({})
  }

  const rangeValue: DateRange | undefined =
    filters.from || filters.to
      ? { from: dateFromIso(filters.from), to: dateFromIso(filters.to) }
      : undefined

  const categoryName =
    filters.categoryId &&
    categories.find((c) => c.id === filters.categoryId)?.name

  const Controls = (
    <div className="grid gap-3 lg:grid-cols-[180px_minmax(180px,1fr)_minmax(260px,320px)_auto] lg:items-end">
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-[12px] font-medium">
          Status
        </label>
        <Select value={filters.status ?? ALL} onValueChange={setStatus}>
          <SelectTrigger className="h-12 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="DRAFT">{STATUS_LABELS.DRAFT}</SelectItem>
            <SelectItem value="PUBLISHED">{STATUS_LABELS.PUBLISHED}</SelectItem>
            <SelectItem value="CLOSED">{STATUS_LABELS.CLOSED}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-[12px] font-medium">
          Categoria
        </label>
        <Select value={filters.categoryId ?? ALL} onValueChange={setCategory}>
          <SelectTrigger className="h-12 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-[12px] font-medium">
          Período
        </label>
        <DateRangePicker
          value={rangeValue}
          onChange={setRange}
          placeholder="Selecione o período"
        />
      </div>

      {activeCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={clearAll}
          className="lg:self-end"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: collapsible button + panel */}
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Filter className="size-4" />
          Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              mobileOpen && 'rotate-180',
            )}
            aria-hidden
          />
        </Button>
        {mobileOpen && (
          <div className="border-border bg-muted/30 mt-3 rounded-[12px] border p-3">
            {Controls}
          </div>
        )}
      </div>

      {/* Desktop: always visible */}
      <div className="hidden lg:block">{Controls}</div>

      {/* Active-filter chips (both viewports) */}
      {activeCount > 0 && (
        <ul className="flex flex-wrap gap-2">
          {filters.status && (
            <Chip
              label={`Status: ${STATUS_LABELS[filters.status]}`}
              onRemove={() => onChange({ ...filters, status: undefined })}
            />
          )}
          {filters.categoryId && categoryName && (
            <Chip
              label={`Categoria: ${categoryName}`}
              onRemove={() => onChange({ ...filters, categoryId: undefined })}
            />
          )}
          {(filters.from || filters.to) && (
            <Chip
              label={`Período: ${filters.from ?? '—'} → ${filters.to ?? '—'}`}
              onRemove={() =>
                onChange({ ...filters, from: undefined, to: undefined })
              }
            />
          )}
        </ul>
      )}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onRemove}
        className="border-border hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {label}
        <X className="size-3" aria-hidden />
      </button>
    </li>
  )
}
