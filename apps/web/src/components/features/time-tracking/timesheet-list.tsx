'use client'

import { Download, FileSpreadsheet } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { endOfDay, startOfDay } from 'date-fns'

import { CloseAssignmentDialog } from './close-assignment-dialog'
import {
  TimesheetFilters,
  type TimesheetFiltersValue,
} from './timesheet-filters'
import { TimesheetRow } from './timesheet-row'
import { useExportCsvHref } from './_hooks/use-export-csv-href'
import { useTimeEntries, type TimeEntryRow } from './_hooks/use-time-entries'

interface Props {
  workspaceId: string
  workspaceTimezone: string
}

function startOfThisWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  const daysSinceMonday = (day + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  return startOfDay(d)
}

function endOfThisWeek(): Date {
  const d = startOfThisWeek()
  d.setDate(d.getDate() + 6)
  return endOfDay(d)
}

function readFiltersFromUrl(sp: URLSearchParams): TimesheetFiltersValue {
  const fromRaw = sp.get('from')
  const toRaw = sp.get('to')
  const userId = sp.get('userId')
  const needsClosure = sp.get('needsClosure') === 'true'
  const fromParsed = fromRaw ? new Date(fromRaw) : null
  const toParsed = toRaw ? new Date(toRaw) : null
  return {
    from:
      fromParsed && !Number.isNaN(fromParsed.getTime())
        ? fromParsed
        : startOfThisWeek(),
    to:
      toParsed && !Number.isNaN(toParsed.getTime())
        ? toParsed
        : endOfThisWeek(),
    userId: userId || null,
    needsClosure,
  }
}

function filtersToParams(
  f: TimesheetFiltersValue,
  base: URLSearchParams,
): string {
  const next = new URLSearchParams(base.toString())
  ;(['from', 'to', 'userId', 'needsClosure'] as const).forEach((k) =>
    next.delete(k),
  )
  if (f.from) next.set('from', f.from.toISOString().slice(0, 10))
  if (f.to) next.set('to', f.to.toISOString().slice(0, 10))
  if (f.userId) next.set('userId', f.userId)
  if (f.needsClosure) next.set('needsClosure', 'true')
  return next.toString()
}

export function TimesheetList({ workspaceId, workspaceTimezone }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => readFiltersFromUrl(searchParams),
    [searchParams],
  )

  const updateFilters = useCallback(
    (next: TimesheetFiltersValue) => {
      const qs = filtersToParams(next, searchParams)
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const query = useTimeEntries(workspaceId, {
    from: filters.from,
    to: filters.to,
    userId: filters.userId,
  })

  const csvHref = useExportCsvHref(workspaceId, {
    from: filters.from,
    to: filters.to,
    userId: filters.userId,
  })

  const [closing, setClosing] = useState<string | null>(null)

  const allItems: TimeEntryRow[] = useMemo(() => {
    return query.data?.pages.flatMap((p) => p.data) ?? []
  }, [query.data])

  const items = useMemo(() => {
    if (!filters.needsClosure) return allItems
    return allItems.filter((e) => e.clockOutAt && !e.closedAt)
  }, [allItems, filters.needsClosure])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-[24px] leading-[28px] font-bold">
            Ponto
          </h1>
          <p className="text-muted-foreground text-[14px]">
            Bate-pontos do workspace, com filtros e exportação CSV.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => {
            if (csvHref) window.location.assign(csvHref)
          }}
          disabled={!csvHref}
        >
          <FileSpreadsheet className="size-4" />
          Exportar CSV
          <Download className="size-4" />
        </Button>
      </div>

      <TimesheetFilters
        workspaceId={workspaceId}
        value={filters}
        onChange={updateFilters}
      />

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[12px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-[12px] border border-dashed py-10 text-center text-[14px]">
          Nenhuma entrada para o período.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 lg:hidden">
            {items.map((e) => (
              <li key={e.id}>
                <TimesheetRow
                  entry={e}
                  workspaceTimezone={workspaceTimezone}
                  variant="card"
                  onClose={(id) => setClosing(id)}
                />
              </li>
            ))}
          </ul>
          <div className="border-border hidden overflow-hidden rounded-[12px] border lg:block">
            <table className="w-full text-left">
              <thead className="bg-muted text-muted-foreground text-[12px] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Turno</th>
                  <th className="px-4 py-3 font-medium">Entrada</th>
                  <th className="px-4 py-3 font-medium">Saída</th>
                  <th className="px-4 py-3 font-medium">Overtime</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <TimesheetRow
                    key={e.id}
                    entry={e}
                    workspaceTimezone={workspaceTimezone}
                    variant="row"
                    onClose={(id) => setClosing(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}

      {closing && (
        <CloseAssignmentDialog
          workspaceId={workspaceId}
          assignmentId={closing}
          open={closing !== null}
          onOpenChange={(open) => !open && setClosing(null)}
        />
      )}
    </section>
  )
}
