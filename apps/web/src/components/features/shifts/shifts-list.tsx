'use client'

import { Clock, Plus, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { AssignUsersDialog } from '~/components/features/assignments/assign-users-dialog'
import { AssignmentsListDialog } from '~/components/features/assignments/assignments-list-dialog'
import { useShiftAssignmentsForSchedule } from '~/components/features/assignments/_hooks/use-shift-assignments-for-schedule'
import { CandidatesListDialog } from '~/components/features/candidates/candidates-list-dialog'
import { useCandidatesSummaryForSchedule } from '~/components/features/candidates/_hooks/use-candidates-summary-for-schedule'
import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { Button } from '~/components/ui/button'
import { DateRangeNav } from '~/components/ui/date-range-nav'
import { Skeleton } from '~/components/ui/skeleton'
import { periodBounds } from '~/lib/date/period'
import type { CalendarView } from '~/lib/date/period'

import { ExpectedCompositionDialog } from './expected-composition-dialog'
import { ScheduleDetailHeader } from './schedule-detail-header'
import { ShiftForm } from './shift-form'
import { ShiftPatternWizard } from './shift-pattern-wizard'
import { ShiftsAgendaView } from './shifts-agenda-view'
import { ShiftsMonthView } from './shifts-month-view'
import { ShiftsTableView } from './shifts-table-view'
import { useScheduleDetail } from './_hooks/use-schedule-detail'
import { useShiftCompositionsForSchedule } from './_hooks/use-shift-compositions-for-schedule'
import { useShifts, type ShiftRow as ShiftRowData } from './_hooks/use-shifts'
import { useShiftsForPeriod } from './_hooks/use-shifts-for-period'

const VALID_VIEWS = new Set<CalendarView>(['month', 'week', 'table'])

interface Props {
  workspaceId: string
  workspaceTimezone: string
  scheduleId: string
  isAdmin: boolean
}

export function ShiftsList({
  workspaceId,
  workspaceTimezone,
  scheduleId,
  isAdmin,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawView = searchParams.get('view') ?? 'month'
  const view: CalendarView = VALID_VIEWS.has(rawView as CalendarView)
    ? (rawView as CalendarView)
    : 'month'
  const cursor = searchParams.get('cursor') ?? ''

  const scheduleQuery = useScheduleDetail(workspaceId, scheduleId)

  // Once schedule loads, seed cursor from periodStart if none in URL
  useEffect(() => {
    if (cursor || !scheduleQuery.data) return
    const defaultCursor = scheduleQuery.data.periodStart.slice(0, 10)
    const params = new URLSearchParams(searchParams.toString())
    params.set('cursor', defaultCursor)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [cursor, scheduleQuery.data, searchParams, router])

  function setView(v: CalendarView) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', v)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  function setCursor(c: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cursor', c)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const activeCursor =
    cursor ||
    (scheduleQuery.data?.periodStart.slice(0, 10) ??
      new Date().toISOString().slice(0, 10))
  const period =
    view !== 'table'
      ? periodBounds(activeCursor, view, workspaceTimezone)
      : null

  const tableQuery = useShifts(workspaceId, scheduleId)
  const periodQuery = useShiftsForPeriod(workspaceId, scheduleId, period)

  const tableItems: ShiftRowData[] = useMemo(
    () => tableQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [tableQuery.data],
  )

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ShiftRowData | null>(null)
  const [editingComposition, setEditingComposition] =
    useState<ShiftRowData | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [assigning, setAssigning] = useState<ShiftRowData | null>(null)
  const [viewingAssignments, setViewingAssignments] =
    useState<ShiftRowData | null>(null)
  const [viewingCandidates, setViewingCandidates] =
    useState<ShiftRowData | null>(null)

  const compositionsQuery = useShiftCompositionsForSchedule(
    workspaceId,
    scheduleId,
  )
  const compositionsByShiftId = compositionsQuery.data

  const assignmentsQuery = useShiftAssignmentsForSchedule(
    workspaceId,
    scheduleId,
  )
  const assignmentsByShiftId = assignmentsQuery.data

  const specialtiesQuery = useTaxonomies('specialties', workspaceId)
  const specialtyNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of specialtiesQuery.data ?? []) map.set(s.id, s.name)
    return map
  }, [specialtiesQuery.data])

  const scheduleStatus = scheduleQuery.data?.status ?? 'DRAFT'
  const canMutate = isAdmin && scheduleStatus === 'DRAFT'
  const canAssign = isAdmin && scheduleStatus === 'PUBLISHED'
  const canViewAssignments =
    isAdmin && (scheduleStatus === 'PUBLISHED' || scheduleStatus === 'CLOSED')
  const canViewCandidates =
    isAdmin && (scheduleStatus === 'PUBLISHED' || scheduleStatus === 'CLOSED')

  const candidatesSummaryQuery = useCandidatesSummaryForSchedule(
    workspaceId,
    scheduleId,
  )
  const candidatesQueuedByShiftId = candidatesSummaryQuery.data

  const schedulePeriod = useMemo(() => {
    if (!scheduleQuery.data) return null
    return {
      start: new Date(scheduleQuery.data.periodStart),
      end: new Date(scheduleQuery.data.periodEnd),
    }
  }, [scheduleQuery.data])

  const sharedCallbacks = {
    onEdit: useCallback((s: ShiftRowData) => setEditing(s), []),
    onEditComposition: useCallback(
      (s: ShiftRowData) => setEditingComposition(s),
      [],
    ),
    onAssign: useCallback((s: ShiftRowData) => setAssigning(s), []),
    onViewAssignments: useCallback(
      (s: ShiftRowData) => setViewingAssignments(s),
      [],
    ),
    onViewCandidates: useCallback(
      (s: ShiftRowData) => setViewingCandidates(s),
      [],
    ),
  }

  const sharedProps = {
    workspaceId,
    scheduleId,
    timezone: workspaceTimezone,
    scheduleStatus,
    isAdmin,
    canAssign,
    canViewAssignments,
    canViewCandidates,
    compositionsByShiftId,
    specialtyNameById,
    assignmentsByShiftId,
    candidatesQueuedByShiftId,
    ...sharedCallbacks,
  }

  return (
    <section aria-labelledby="shifts-heading" className="flex flex-col gap-6">
      <ScheduleDetailHeader
        workspaceId={workspaceId}
        scheduleId={scheduleId}
        workspaceTimezone={workspaceTimezone}
      />

      <DateRangeNav
        view={view}
        cursor={activeCursor}
        timezone={workspaceTimezone}
        views={['month', 'week', 'table']}
        onViewChange={setView}
        onCursorChange={setCursor}
      />

      {canMutate && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="shifts-heading"
            className="text-foreground text-[18px] font-semibold"
          >
            Turnos
          </h2>
          {tableItems.length > 0 || view !== 'table' ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setWizardOpen(true)}
              >
                <Sparkles className="size-4" /> Gerar por padrão
              </Button>
              <Button
                type="button"
                variant="solid"
                size="md"
                onClick={() => setCreating(true)}
              >
                <Plus className="size-4" /> Novo turno
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {view === 'month' && (
        <ShiftsMonthView
          shifts={periodQuery.data ?? []}
          cursor={activeCursor}
          timezone={workspaceTimezone}
          isLoading={periodQuery.isLoading}
          onCursorChange={setCursor}
          onViewChange={() => setView('week')}
        />
      )}

      {view === 'week' && (
        <ShiftsAgendaView
          shifts={periodQuery.data ?? []}
          cursor={activeCursor}
          view={view}
          isLoading={periodQuery.isLoading}
          {...sharedProps}
        />
      )}

      {view === 'table' && (
        <>
          {tableQuery.isLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
              ))}
            </div>
          ) : tableItems.length === 0 ? (
            <EmptyState
              canMutate={canMutate}
              onCreate={() => setCreating(true)}
              onPattern={() => setWizardOpen(true)}
            />
          ) : (
            <ShiftsTableView query={tableQuery} {...sharedProps} />
          )}
        </>
      )}

      {creating && (
        <ShiftForm
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          open={creating}
          onOpenChange={setCreating}
          mode="create"
        />
      )}

      {editing && (
        <ShiftForm
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          initial={editing}
        />
      )}

      {editingComposition && (
        <ExpectedCompositionDialog
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          shift={{
            id: editingComposition.id,
            headcount: editingComposition.headcount,
          }}
          open={editingComposition !== null}
          onOpenChange={(open) => !open && setEditingComposition(null)}
        />
      )}

      {wizardOpen && schedulePeriod && (
        <ShiftPatternWizard
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          schedulePeriod={schedulePeriod}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
        />
      )}

      {assigning && (
        <AssignUsersDialog
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          shift={{
            id: assigning.id,
            headcount: assigning.headcount,
            categoryId: assigning.categoryId,
          }}
          open={assigning !== null}
          onOpenChange={(open) => !open && setAssigning(null)}
        />
      )}

      {viewingAssignments && (
        <AssignmentsListDialog
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          shift={{
            id: viewingAssignments.id,
            headcount: viewingAssignments.headcount,
          }}
          open={viewingAssignments !== null}
          onOpenChange={(open) => !open && setViewingAssignments(null)}
        />
      )}

      {viewingCandidates && (
        <CandidatesListDialog
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          shift={{
            id: viewingCandidates.id,
            headcount: viewingCandidates.headcount,
          }}
          open={viewingCandidates !== null}
          onOpenChange={(open) => !open && setViewingCandidates(null)}
        />
      )}
    </section>
  )
}

function EmptyState({
  canMutate,
  onCreate,
  onPattern,
}: {
  canMutate: boolean
  onCreate: () => void
  onPattern: () => void
}) {
  if (canMutate) {
    return (
      <div className="border-border flex flex-col items-center gap-3 rounded-[12px] border border-dashed py-10 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Clock className="text-muted-foreground size-5" aria-hidden />
        </div>
        <h3 className="text-foreground text-[16px] font-semibold">
          Crie o primeiro turno desta escala
        </h3>
        <p className="text-muted-foreground max-w-md text-[14px]">
          Defina a categoria, o intervalo de início e fim, o número de vagas e
          notas opcionais. Depois você pode abrir para inscrição.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="solid" size="md" onClick={onCreate}>
            <Plus className="size-4" /> Criar primeiro turno
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onPattern}>
            <Sparkles className="size-4" /> Gerar por padrão
          </Button>
        </div>
      </div>
    )
  }
  return (
    <p className="text-muted-foreground border-border rounded-[12px] border border-dashed py-10 text-center text-[14px]">
      Nenhum turno nesta escala.
    </p>
  )
}
