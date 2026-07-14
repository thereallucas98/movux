'use client'

import { Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'

import { ScheduleForm } from './schedule-form'
import { ScheduleRow } from './schedule-row'
import { SchedulesFilterBar } from './schedules-filter-bar'
import {
  useSchedules,
  type ListFilters,
  type ScheduleRow as ScheduleRowData,
} from './_hooks/use-schedules'
import type { ScheduleStatus } from './schedule-status-tag'

interface Props {
  workspaceId: string
  workspaceTimezone: string
  isAdmin: boolean
}

const VALID_STATUSES = new Set<ScheduleStatus>(['DRAFT', 'PUBLISHED', 'CLOSED'])

function readFiltersFromUrl(sp: URLSearchParams): ListFilters {
  const status = sp.get('status')
  const categoryId = sp.get('categoryId')
  const from = sp.get('from')
  const to = sp.get('to')
  return {
    status:
      status && VALID_STATUSES.has(status as ScheduleStatus)
        ? (status as ScheduleStatus)
        : undefined,
    categoryId: categoryId ?? undefined,
    from: from ?? undefined,
    to: to ?? undefined,
  }
}

function filtersToParams(filters: ListFilters, base: URLSearchParams) {
  const next = new URLSearchParams(base.toString())
  next.delete('status')
  next.delete('categoryId')
  next.delete('from')
  next.delete('to')
  if (filters.status) next.set('status', filters.status)
  if (filters.categoryId) next.set('categoryId', filters.categoryId)
  if (filters.from) next.set('from', filters.from)
  if (filters.to) next.set('to', filters.to)
  return next.toString()
}

export function SchedulesList({
  workspaceId,
  workspaceTimezone,
  isAdmin,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => readFiltersFromUrl(searchParams),
    [searchParams],
  )
  const hasFilter =
    !!filters.status || !!filters.categoryId || !!filters.from || !!filters.to

  const updateFilters = useCallback(
    (next: ListFilters) => {
      const qs = filtersToParams(next, searchParams)
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const query = useSchedules(workspaceId, filters)
  const categoriesQuery = useTaxonomies('categories', workspaceId)
  const categoriesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categoriesQuery.data ?? []) map.set(c.id, c.name)
    return map
  }, [categoriesQuery.data])

  const allItems: ScheduleRowData[] = useMemo(() => {
    return query.data?.pages.flatMap((p) => p.data) ?? []
  }, [query.data])

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ScheduleRowData | null>(null)

  return (
    <section
      aria-labelledby="schedules-heading"
      className="flex flex-col gap-6"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            id="schedules-heading"
            className="text-foreground text-[24px] leading-[28px] font-bold"
          >
            Escalas
          </h1>
          <p className="text-muted-foreground text-[14px]">
            Gerencie escalas por categoria e período. Publique quando estiverem
            prontas e encerre após o período.
          </p>
        </div>
        {isAdmin && (
          <Button
            type="button"
            variant="solid"
            size="md"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" /> Nova escala
          </Button>
        )}
      </header>

      <SchedulesFilterBar
        workspaceId={workspaceId}
        filters={filters}
        onChange={updateFilters}
      />

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <EmptyState isAdmin={isAdmin} hasFilter={hasFilter} />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {allItems.map((s) => (
              <ScheduleRow
                key={s.id}
                workspaceId={workspaceId}
                schedule={{
                  ...s,
                  categoryName: categoriesById.get(s.categoryId),
                }}
                workspaceTimezone={workspaceTimezone}
                isAdmin={isAdmin}
                variant="card"
                onEdit={(sched) => setEditing(sched)}
              />
            ))}
          </ul>

          {/* Desktop table */}
          <div className="border-border hidden overflow-hidden rounded-[12px] border lg:block">
            <table className="w-full text-left">
              <thead className="bg-muted text-muted-foreground text-[12px] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((s) => (
                  <ScheduleRow
                    key={s.id}
                    workspaceId={workspaceId}
                    schedule={{
                      ...s,
                      categoryName: categoriesById.get(s.categoryId),
                    }}
                    workspaceTimezone={workspaceTimezone}
                    isAdmin={isAdmin}
                    variant="row"
                    onEdit={(sched) => setEditing(sched)}
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

      {creating && (
        <ScheduleForm
          workspaceId={workspaceId}
          open={creating}
          onOpenChange={setCreating}
          mode="create"
        />
      )}

      {editing && (
        <ScheduleForm
          workspaceId={workspaceId}
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          initial={{
            id: editing.id,
            status: editing.status,
            categoryId: editing.categoryId,
            name: editing.name,
            periodStart: editing.periodStart,
            periodEnd: editing.periodEnd,
          }}
        />
      )}
    </section>
  )
}

function EmptyState({
  isAdmin,
  hasFilter,
}: {
  isAdmin: boolean
  hasFilter: boolean
}) {
  if (hasFilter) {
    return (
      <p className="text-muted-foreground border-border rounded-[12px] border border-dashed py-10 text-center text-[14px]">
        Nenhuma escala encontrada para os filtros aplicados.
      </p>
    )
  }
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-[12px] border border-dashed py-10 text-center">
      <h3 className="text-foreground text-[16px] font-semibold">
        Nenhuma escala neste workspace
      </h3>
      <p className="text-muted-foreground max-w-md text-[14px]">
        {isAdmin
          ? 'Crie sua primeira escala selecionando uma categoria e o período.'
          : 'Aguarde um administrador criar uma escala.'}
      </p>
    </div>
  )
}
