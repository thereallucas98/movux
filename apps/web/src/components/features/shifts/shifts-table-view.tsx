'use client'

import { useState } from 'react'

import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

import { ShiftRow } from './shift-row'
import type { ShiftRow as ShiftRowData } from './_hooks/use-shifts'
import type { ShiftCompositionItem } from './_hooks/use-shift-expected-composition'
import type { ScheduleStatus } from '~/components/features/schedules/schedule-status-tag'
import type { UseInfiniteQueryResult } from '@tanstack/react-query'

interface PageResponse {
  data: ShiftRowData[]
  nextCursor: string | null
}

interface Props {
  workspaceId: string
  scheduleId: string
  timezone: string
  scheduleStatus: ScheduleStatus
  isAdmin: boolean
  canAssign: boolean
  canViewAssignments: boolean
  canViewCandidates: boolean
  compositionsByShiftId: Map<string, ShiftCompositionItem[]> | undefined
  specialtyNameById: Map<string, string>
  assignmentsByShiftId: Map<string, { status: string }[]> | undefined
  candidatesQueuedByShiftId: Map<string, number> | undefined
  query: UseInfiniteQueryResult<{ pages: PageResponse[] }, Error>
  onEdit: (shift: ShiftRowData) => void
  onEditComposition: (shift: ShiftRowData) => void
  onAssign: (shift: ShiftRowData) => void
  onViewAssignments: (shift: ShiftRowData) => void
  onViewCandidates: (shift: ShiftRowData) => void
}

const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  'ACCEPTED',
  'PENDING_CLOSURE',
  'COMPLETED',
])

export function ShiftsTableView({
  workspaceId,
  scheduleId,
  timezone,
  scheduleStatus,
  isAdmin,
  canAssign,
  canViewAssignments,
  canViewCandidates,
  compositionsByShiftId,
  specialtyNameById,
  assignmentsByShiftId,
  candidatesQueuedByShiftId,
  query,
  onEdit,
  onEditComposition,
  onAssign,
  onViewAssignments,
  onViewCandidates,
}: Props) {
  const [cursorStack, setCursorStack] = useState<string[]>([])

  const allItems: ShiftRowData[] =
    query.data?.pages.flatMap((p) => p.data) ?? []
  const lastPage = query.data?.pages[query.data.pages.length - 1]
  const hasNext = Boolean(lastPage?.nextCursor)
  const hasPrev = cursorStack.length > 0

  function handleNext() {
    if (!lastPage?.nextCursor) return
    setCursorStack((prev) => [...prev, lastPage.nextCursor!])
    query.fetchNextPage().catch(() => undefined)
  }

  function handlePrev() {
    setCursorStack((prev) => prev.slice(0, -1))
    query.fetchPreviousPage?.().catch(() => undefined)
  }

  function summaryFor(shiftId: string) {
    const list = assignmentsByShiftId?.get(shiftId) ?? []
    let active = 0
    let pending = 0
    for (const a of list) {
      if (a.status === 'PENDING_ACCEPT') pending += 1
      else if (ACTIVE_ASSIGNMENT_STATUSES.has(a.status)) active += 1
    }
    return { active, pending, total: active + pending }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
        ))}
      </div>
    )
  }

  if (allItems.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-[12px] border border-dashed py-10 text-center text-[14px]">
        Nenhum turno nesta escala.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3 lg:hidden">
        {allItems.map((s) => (
          <ShiftRow
            key={s.id}
            workspaceId={workspaceId}
            scheduleId={scheduleId}
            workspaceTimezone={timezone}
            shift={s}
            scheduleStatus={scheduleStatus}
            isAdmin={isAdmin}
            variant="card"
            onEdit={onEdit}
            composition={compositionsByShiftId?.get(s.id) ?? []}
            specialtyNameById={specialtyNameById}
            onEditComposition={onEditComposition}
            assignmentSummary={summaryFor(s.id)}
            canAssign={canAssign}
            canViewAssignments={canViewAssignments}
            onAssign={onAssign}
            onViewAssignments={onViewAssignments}
            canViewCandidates={canViewCandidates}
            candidatesQueuedCount={candidatesQueuedByShiftId?.get(s.id) ?? 0}
            onViewCandidates={onViewCandidates}
          />
        ))}
      </ul>

      <div className="border-border hidden overflow-hidden rounded-[12px] border lg:block">
        <table className="w-full text-left">
          <thead className="bg-muted text-muted-foreground text-[12px] uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Início</th>
              <th className="px-4 py-3 font-medium">Fim</th>
              <th className="px-4 py-3 font-medium">Vagas</th>
              <th className="px-4 py-3 font-medium">Composição</th>
              <th className="px-4 py-3 font-medium">Atribuições</th>
              <th className="px-4 py-3 font-medium">Modo</th>
              <th className="px-4 py-3 font-medium">Notas</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((s) => (
              <ShiftRow
                key={s.id}
                workspaceId={workspaceId}
                scheduleId={scheduleId}
                workspaceTimezone={timezone}
                shift={s}
                scheduleStatus={scheduleStatus}
                isAdmin={isAdmin}
                variant="row"
                onEdit={onEdit}
                composition={compositionsByShiftId?.get(s.id) ?? []}
                specialtyNameById={specialtyNameById}
                onEditComposition={onEditComposition}
              />
            ))}
          </tbody>
        </table>
      </div>

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={!hasPrev}
          >
            Anterior
          </Button>
          {cursorStack.length > 0 && (
            <span className="text-muted-foreground text-sm">
              Página {cursorStack.length + 1}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!hasNext || query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? 'Carregando…' : 'Próxima'}
          </Button>
        </div>
      )}
    </div>
  )
}
