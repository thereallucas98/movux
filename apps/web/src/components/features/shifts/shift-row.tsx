'use client'

import { ChevronRight, MoreVertical, Users } from 'lucide-react'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { IconButton } from '~/components/ui/icon-button'
import { categoryVisual } from '~/lib/format/category-visual'
import { formatShiftStartLabel } from '~/lib/format/date'
import { cn } from '~/lib/utils'

import { DeleteShiftDialog } from './delete-shift-dialog'
import { ShiftAssignmentModeTag } from './shift-assignment-mode-tag'
import type { ShiftCompositionItem } from './_hooks/use-shift-expected-composition'
import type { ShiftRow as ShiftRowData } from './_hooks/use-shifts'
import type { ScheduleStatus } from '~/components/features/schedules/schedule-status-tag'

interface Props {
  workspaceId: string
  scheduleId: string
  workspaceTimezone: string
  shift: ShiftRowData
  scheduleStatus: ScheduleStatus
  isAdmin: boolean
  variant: 'card' | 'compact' | 'row'
  onEdit: (shift: ShiftRowData) => void
  composition?: ShiftCompositionItem[]
  specialtyNameById?: Map<string, string>
  onEditComposition?: (shift: ShiftRowData) => void
  assignmentSummary?: { active: number; pending: number; total: number }
  canAssign?: boolean
  canViewAssignments?: boolean
  onAssign?: (shift: ShiftRowData) => void
  onViewAssignments?: (shift: ShiftRowData) => void
  canViewCandidates?: boolean
  candidatesQueuedCount?: number
  onViewCandidates?: (shift: ShiftRowData) => void
}

function rangeLabel(
  start: Date,
  end: Date,
  timezone: string,
): { startLabel: string; endLabel: string } {
  return {
    startLabel: formatShiftStartLabel(start, timezone),
    endLabel: formatShiftStartLabel(end, timezone),
  }
}

function summarize(
  items: ShiftCompositionItem[],
  names: Map<string, string>,
): string {
  if (items.length === 0) return ''
  return items
    .map((i) => ({ count: i.count, name: names.get(i.specialtyId) ?? '—' }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
    .map((i) => `${i.count} ${i.name}`)
    .join(' · ')
}

export function ShiftRow({
  workspaceId,
  scheduleId,
  workspaceTimezone,
  shift,
  scheduleStatus,
  isAdmin,
  variant,
  onEdit,
  composition = [],
  specialtyNameById,
  onEditComposition,
  assignmentSummary,
  canAssign = false,
  canViewAssignments = false,
  onAssign,
  onViewAssignments,
  canViewCandidates = false,
  candidatesQueuedCount = 0,
  onViewCandidates,
}: Props) {
  const visual = categoryVisual(shift.categoryId)
  const start = new Date(shift.startAt)
  const end = new Date(shift.endAt)
  const { startLabel, endLabel } = rangeLabel(start, end, workspaceTimezone)
  const isDraft = scheduleStatus === 'DRAFT'
  const canDraftEdit = isAdmin && isDraft
  const summary = specialtyNameById
    ? summarize(composition, specialtyNameById)
    : ''
  const compositionLabel = summary || 'Composição não definida'
  const tableCompositionLabel = summary || 'Não definida'

  const isOpenForApply = shift.assignmentMode === 'OPEN_FOR_APPLY'
  const queuedSuffix =
    isOpenForApply && candidatesQueuedCount > 0
      ? ` · ${candidatesQueuedCount} na fila`
      : ''

  const assignmentSummaryLabel =
    !assignmentSummary || assignmentSummary.total === 0
      ? `Sem atribuídos${queuedSuffix}`
      : `${assignmentSummary.active}/${shift.headcount} atribuídos${
          assignmentSummary.pending > 0
            ? ` · ${assignmentSummary.pending} pendentes`
            : ''
        }${queuedSuffix}`

  const assignmentSummaryClass =
    !assignmentSummary || assignmentSummary.active === 0
      ? 'text-muted-foreground'
      : assignmentSummary.active === shift.headcount
        ? 'text-green-700'
        : 'text-amber-700'

  const canViewCandidatesGated =
    canViewCandidates && isOpenForApply && Boolean(onViewCandidates)

  const showKebab =
    canDraftEdit ||
    (canAssign && Boolean(onAssign)) ||
    (canViewAssignments && Boolean(onViewAssignments)) ||
    canViewCandidatesGated

  const kebab = showKebab ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="outline"
          size="sm"
          aria-label={`Ações para o turno de ${startLabel}`}
        >
          <MoreVertical />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {canDraftEdit && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onEdit(shift)
            }}
          >
            Editar
          </DropdownMenuItem>
        )}
        {canDraftEdit && onEditComposition && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onEditComposition(shift)
            }}
          >
            Editar composição
          </DropdownMenuItem>
        )}
        {canAssign && onAssign && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAssign(shift)
            }}
          >
            Atribuir
          </DropdownMenuItem>
        )}
        {canViewAssignments && onViewAssignments && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onViewAssignments(shift)
            }}
          >
            Ver atribuídos
          </DropdownMenuItem>
        )}
        {canViewCandidatesGated && onViewCandidates && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onViewCandidates(shift)
            }}
          >
            Ver candidatos
          </DropdownMenuItem>
        )}
        {canDraftEdit && (
          <DeleteShiftDialog
            workspaceId={workspaceId}
            scheduleId={scheduleId}
            shiftId={shift.id}
            trigger={
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive"
              >
                Apagar
              </DropdownMenuItem>
            }
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  if (variant === 'compact') {
    const startTime = formatInTimeZone(start, workspaceTimezone, 'HH:mm')
    const endTime = formatInTimeZone(end, workspaceTimezone, 'HH:mm')
    const filledLabel =
      !assignmentSummary || assignmentSummary.total === 0
        ? `0/${shift.headcount}v`
        : `${assignmentSummary.active}/${shift.headcount}v`

    return (
      <li className={cn('overflow-hidden rounded-lg', visual.chipClass)}>
        <div className="flex items-start justify-between gap-1 px-2 py-1.5">
          <Link
            href={`/schedules/${scheduleId}/shifts/${shift.id}`}
            className="min-w-0 flex-1"
          >
            <span className="block text-[12px] leading-snug font-semibold tabular-nums">
              {startTime} – {endTime}
            </span>
            <span
              className={cn(
                'block text-[11px] leading-snug opacity-80',
                assignmentSummaryClass,
              )}
            >
              {filledLabel}
              {assignmentSummary && assignmentSummary.pending > 0
                ? ` · ${assignmentSummary.pending} pend.`
                : ''}
            </span>
          </Link>
          {showKebab && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  size="sm"
                  aria-label={`Ações para o turno de ${startLabel}`}
                  className="h-5 w-5 shrink-0"
                >
                  <MoreVertical className="size-3" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canDraftEdit && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      onEdit(shift)
                    }}
                  >
                    Editar
                  </DropdownMenuItem>
                )}
                {canDraftEdit && onEditComposition && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      onEditComposition(shift)
                    }}
                  >
                    Editar composição
                  </DropdownMenuItem>
                )}
                {canAssign && onAssign && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      onAssign(shift)
                    }}
                  >
                    Atribuir
                  </DropdownMenuItem>
                )}
                {canViewAssignments && onViewAssignments && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      onViewAssignments(shift)
                    }}
                  >
                    Ver atribuídos
                  </DropdownMenuItem>
                )}
                {canViewCandidatesGated && onViewCandidates && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      onViewCandidates(shift)
                    }}
                  >
                    Ver candidatos
                  </DropdownMenuItem>
                )}
                {canDraftEdit && (
                  <DeleteShiftDialog
                    workspaceId={workspaceId}
                    scheduleId={scheduleId}
                    shiftId={shift.id}
                    trigger={
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive"
                      >
                        Apagar
                      </DropdownMenuItem>
                    }
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </li>
    )
  }

  if (variant === 'card') {
    return (
      <li className="border-border bg-background flex flex-col gap-3 rounded-[12px] border p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-[8px]',
              visual.blockClass,
            )}
            aria-hidden
          >
            <visual.Icon className="size-4" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <Link
              href={`/schedules/${scheduleId}/shifts/${shift.id}`}
              className="text-foreground inline-flex items-center gap-1 text-[15px] font-semibold hover:underline"
            >
              <span>
                {startLabel} – {endLabel}
              </span>
              <ChevronRight
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </Link>
            <span className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-[13px]">
              <Users className="size-3.5" aria-hidden />
              {shift.headcount} {shift.headcount === 1 ? 'vaga' : 'vagas'}
            </span>
            <span className="text-muted-foreground mt-1 truncate text-[13px]">
              {compositionLabel}
            </span>
            <span
              className={cn(
                'mt-1 truncate text-[13px]',
                assignmentSummaryClass,
              )}
            >
              {assignmentSummaryLabel}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ShiftAssignmentModeTag mode={shift.assignmentMode} />
            </div>
            {shift.notes && (
              <span className="text-muted-foreground mt-2 truncate text-[13px]">
                {shift.notes}
              </span>
            )}
          </div>
          {kebab}
        </div>
      </li>
    )
  }

  return (
    <tr className="border-border border-b last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-[8px]',
              visual.blockClass,
            )}
            aria-hidden
          >
            <visual.Icon className="size-4" aria-hidden />
          </div>
          <Link
            href={`/schedules/${scheduleId}/shifts/${shift.id}`}
            className="text-foreground inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
          >
            <span>{startLabel}</span>
            <ChevronRight
              className="text-muted-foreground size-4"
              aria-hidden
            />
          </Link>
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-3 text-[14px]">
        {endLabel}
      </td>
      <td className="text-foreground px-4 py-3 text-[14px]">
        {shift.headcount}
      </td>
      <td className="text-muted-foreground max-w-[18rem] truncate px-4 py-3 text-[13px]">
        {tableCompositionLabel}
      </td>
      <td className={cn('px-4 py-3 text-[13px]', assignmentSummaryClass)}>
        {assignmentSummaryLabel}
      </td>
      <td className="px-4 py-3">
        <ShiftAssignmentModeTag mode={shift.assignmentMode} />
      </td>
      <td className="text-muted-foreground max-w-[24rem] truncate px-4 py-3 text-[13px]">
        {shift.notes ?? '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">{kebab}</div>
      </td>
    </tr>
  )
}
