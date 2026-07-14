'use client'

import { ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { AssignmentStatusTag } from '~/components/features/assignments/assignment-status-tag'
import { DeadlineTag } from '~/components/features/assignments/deadline-tag'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Tag } from '~/components/ui/tag'
import { useGeolocation } from '~/hooks/use-geolocation'
import { categoryVisual } from '~/lib/format/category-visual'
import { formatShiftStartLabel } from '~/lib/format/date'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useAcceptMyAssignment } from './_hooks/use-accept-my-assignment'
import { useClockIn } from './_hooks/use-clock-in'
import { useClockOut } from './_hooks/use-clock-out'
import type { MyAssignmentRow } from './_hooks/use-my-assignments'
import { RejectMyAssignmentForm } from './reject-my-assignment-form'

interface Props {
  assignment: MyAssignmentRow
  variant: 'pending' | 'accepted' | 'history'
  workspaceTimezone?: string
}

function formatTime(iso: string, tz: string) {
  return formatShiftStartLabel(new Date(iso), tz)
}

export function MyShiftCard({
  assignment,
  variant,
  workspaceTimezone = 'America/Sao_Paulo',
}: Props) {
  const acceptMutation = useAcceptMyAssignment()
  const clockInMutation = useClockIn()
  const clockOutMutation = useClockOut()
  const { getLocation } = useGeolocation()

  const [showRejectForm, setShowRejectForm] = useState(false)

  const visual = categoryVisual(assignment.shift.categoryId)
  const start = new Date(assignment.shift.startAt)
  const end = new Date(assignment.shift.endAt)
  const startLabel = formatShiftStartLabel(start, workspaceTimezone)
  const endLabel = formatShiftStartLabel(end, workspaceTimezone)

  async function handleAccept() {
    try {
      await acceptMutation.mutateAsync(assignment.id)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'DECISION_WINDOW_EXPIRED') {
        toast.error('O prazo para responder expirou.')
        return
      }
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta atribuição não pode mais ser aceita.')
        return
      }
      toast.error('Não foi possível aceitar.')
    }
  }

  async function handleClockIn() {
    const location = await getLocation()
    try {
      await clockInMutation.mutateAsync({
        assignmentId: assignment.id,
        ...(location ?? {}),
      })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'ALREADY_CLOCKED_IN') {
        toast.error('Você já bateu ponto neste turno.')
        return
      }
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Não é possível bater ponto agora.')
        return
      }
      toast.error('Não foi possível registrar o ponto.')
    }
  }

  async function handleClockOut() {
    const location = await getLocation()
    try {
      await clockOutMutation.mutateAsync({
        assignmentId: assignment.id,
        ...(location ?? {}),
      })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Não é possível registrar a saída agora.')
        return
      }
      toast.error('Não foi possível registrar a saída.')
    }
  }

  const ote = assignment.openTimeEntry

  return (
    <Card className="flex flex-col gap-4 p-4">
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
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/schedules/${assignment.shift.scheduleId}/shifts/${assignment.shift.id}`}
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
          <div className="flex flex-wrap items-center gap-2">
            <AssignmentStatusTag status={assignment.status} />
            {variant === 'pending' && (
              <DeadlineTag deadline={assignment.decisionDeadline} />
            )}
            {ote && !ote.clockOutAt && <Tag category="green">Em andamento</Tag>}
            {ote?.clockInWithinTolerance === false && (
              <Tag category="red">Entrada fora da tolerância</Tag>
            )}
            {ote?.clockOutWithinTolerance === false && (
              <Tag category="red">Saída fora da tolerância</Tag>
            )}
          </div>
          {ote && (
            <span className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-[13px]">
              <Clock className="size-3.5" aria-hidden />
              Entrada: {formatTime(ote.clockInAt, workspaceTimezone)}
              {ote.clockOutAt && (
                <> · Saída: {formatTime(ote.clockOutAt, workspaceTimezone)}</>
              )}
            </span>
          )}
          {ote?.closedAt && (
            <span className="text-muted-foreground mt-1 text-[13px]">
              Fechado em {formatTime(ote.closedAt, workspaceTimezone)}
            </span>
          )}
          {assignment.rejectionReason && (
            <span className="text-muted-foreground mt-1 text-[13px]">
              Motivo: {assignment.rejectionReason}
            </span>
          )}
        </div>
      </div>

      {variant === 'pending' && !showRejectForm && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setShowRejectForm(true)}
            disabled={acceptMutation.isPending}
          >
            Rejeitar
          </Button>
          <Button
            type="button"
            variant="solid"
            size="md"
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? 'Aceitando…' : 'Aceitar'}
          </Button>
        </div>
      )}

      {variant === 'pending' && showRejectForm && (
        <RejectMyAssignmentForm
          assignmentId={assignment.id}
          onCancel={() => setShowRejectForm(false)}
          onDone={() => setShowRejectForm(false)}
        />
      )}

      {variant === 'accepted' && assignment.status === 'ACCEPTED' && !ote && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="solid"
            size="md"
            onClick={handleClockIn}
            disabled={clockInMutation.isPending}
          >
            {clockInMutation.isPending
              ? 'Registrando…'
              : 'Bater ponto (entrada)'}
          </Button>
        </div>
      )}

      {variant === 'accepted' &&
        assignment.status === 'ACCEPTED' &&
        ote &&
        !ote.clockOutAt && (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClockOut}
              disabled={clockOutMutation.isPending}
            >
              {clockOutMutation.isPending
                ? 'Registrando…'
                : 'Bater ponto (saída)'}
            </Button>
          </div>
        )}

      {variant === 'accepted' && assignment.status === 'PENDING_CLOSURE' && (
        <span className="text-muted-foreground text-[13px]">
          Aguardando fechamento pelo coordenador.
        </span>
      )}
    </Card>
  )
}
