'use client'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Tag } from '~/components/ui/tag'
import { formatShiftStartLabel } from '~/lib/format/date'
import { cn } from '~/lib/utils'

import type { TimeEntryRow } from './_hooks/use-time-entries'

interface Props {
  entry: TimeEntryRow
  workspaceTimezone: string
  variant: 'card' | 'row'
  onClose: (assignmentId: string) => void
}

function statusOf(entry: TimeEntryRow): {
  label: string
  category: 'green' | 'orange' | 'gray' | 'yellow'
} {
  if (entry.closedAt) return { label: 'Fechado', category: 'green' }
  if (entry.clockOutAt)
    return { label: 'Pendente de fechamento', category: 'orange' }
  return { label: 'Em andamento', category: 'yellow' }
}

function formatTime(iso: string | null, tz: string): string {
  if (!iso) return '—'
  return formatShiftStartLabel(new Date(iso), tz)
}

export function TimesheetRow({
  entry,
  workspaceTimezone,
  variant,
  onClose,
}: Props) {
  const status = statusOf(entry)
  const userName = entry.shiftAssignment.user?.fullName ?? '—'
  const shiftStart = formatTime(
    entry.shiftAssignment.shift.startAt,
    workspaceTimezone,
  )
  const shiftEnd = formatTime(
    entry.shiftAssignment.shift.endAt,
    workspaceTimezone,
  )
  const inLabel = formatTime(entry.clockInAt, workspaceTimezone)
  const outLabel = formatTime(entry.clockOutAt, workspaceTimezone)
  const canClose = !entry.closedAt && Boolean(entry.clockOutAt)

  if (variant === 'card') {
    return (
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-foreground truncate text-[15px] font-semibold">
              {userName}
            </span>
            <span className="text-muted-foreground text-[13px]">
              Turno: {shiftStart} – {shiftEnd}
            </span>
          </div>
          <Tag category={status.category}>{status.label}</Tag>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span>Entrada: {inLabel}</span>
          <span>Saída: {outLabel}</span>
          {entry.overtimeMinutes > 0 && (
            <span>Overtime: {entry.overtimeMinutes}min</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entry.clockInWithinTolerance === false && (
            <Tag category="red">Entrada fora da tolerância</Tag>
          )}
          {entry.clockOutWithinTolerance === false && (
            <Tag category="red">Saída fora da tolerância</Tag>
          )}
        </div>
        {entry.notes && (
          <span className="text-muted-foreground text-[13px]">
            Notas: {entry.notes}
          </span>
        )}
        {canClose && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="solid"
              size="sm"
              onClick={() => onClose(entry.shiftAssignmentId)}
            >
              Fechar
            </Button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <tr className="border-border border-b last:border-b-0">
      <td className="text-foreground px-4 py-3 text-[14px] font-medium">
        {userName}
      </td>
      <td className="text-muted-foreground px-4 py-3 text-[13px]">
        {shiftStart} – {shiftEnd}
      </td>
      <td className="text-muted-foreground px-4 py-3 text-[13px]">
        <div className="flex flex-col gap-1">
          <span>{inLabel}</span>
          {entry.clockInWithinTolerance === false && (
            <Tag category="red">Fora da tolerância</Tag>
          )}
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-3 text-[13px]">
        <div className="flex flex-col gap-1">
          <span>{outLabel}</span>
          {entry.clockOutWithinTolerance === false && (
            <Tag category="red">Fora da tolerância</Tag>
          )}
        </div>
      </td>
      <td
        className={cn(
          'px-4 py-3 text-[13px]',
          entry.overtimeMinutes > 0 && 'text-amber-700',
        )}
      >
        {entry.overtimeMinutes > 0 ? `${entry.overtimeMinutes}min` : '—'}
      </td>
      <td className="px-4 py-3">
        <Tag category={status.category}>{status.label}</Tag>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {canClose && (
            <Button
              type="button"
              variant="solid"
              size="sm"
              onClick={() => onClose(entry.shiftAssignmentId)}
            >
              Fechar
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
