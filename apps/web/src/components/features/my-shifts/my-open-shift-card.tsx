'use client'

import { Users } from 'lucide-react'
import { toast } from 'sonner'

import { CandidateStatusTag } from '~/components/features/candidates/candidate-status-tag'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Tag } from '~/components/ui/tag'
import { categoryVisual } from '~/lib/format/category-visual'
import { formatShiftStartLabel } from '~/lib/format/date'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useApplyToShift } from './_hooks/use-apply-to-shift'
import type { MyOpenShiftRow } from './_hooks/use-my-open-shifts'
import { useWithdrawCandidacy } from './_hooks/use-withdraw-candidacy'

interface Props {
  openShift: MyOpenShiftRow
  variant: 'available' | 'waitlist'
  workspaceTimezone?: string
}

export function MyOpenShiftCard({
  openShift,
  variant,
  workspaceTimezone = 'America/Sao_Paulo',
}: Props) {
  const applyMutation = useApplyToShift()
  const withdrawMutation = useWithdrawCandidacy()
  const visual = categoryVisual(openShift.categoryId)
  const startLabel = formatShiftStartLabel(
    new Date(openShift.startAt),
    workspaceTimezone,
  )
  const endLabel = formatShiftStartLabel(
    new Date(openShift.endAt),
    workspaceTimezone,
  )

  const candidacy = openShift.myCandidacy

  async function handleApply() {
    try {
      await applyMutation.mutateAsync(openShift.id)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'ALREADY_EXISTS') {
        toast.error('Você já se inscreveu neste turno.')
        return
      }
      if (code === 'SHIFT_OVERLAP_CONFLICT') {
        toast.error('Você já tem outro turno neste horário.')
        return
      }
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Este turno não está mais aberto.')
        return
      }
      toast.error('Não foi possível se candidatar.')
    }
  }

  async function handleWithdraw() {
    if (!candidacy) return
    try {
      await withdrawMutation.mutateAsync(candidacy.id)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta candidatura não pode mais ser retirada.')
        return
      }
      toast.error('Não foi possível retirar.')
    }
  }

  const canApply =
    !candidacy ||
    candidacy.status === 'WITHDRAWN' ||
    candidacy.status === 'REJECTED'

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
          <span className="text-foreground text-[15px] font-semibold">
            {startLabel} – {endLabel}
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-[13px]">
            <Users className="size-3.5" aria-hidden />
            {openShift.activeAssignmentsCount}/{openShift.headcount} preenchido
          </span>
          <span className="text-muted-foreground text-[13px]">
            {openShift.categoryName}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag category={variant === 'waitlist' ? 'orange' : 'blue'}>
              {variant === 'waitlist' ? 'Lista de espera' : 'Com vagas'}
            </Tag>
            {candidacy && <CandidateStatusTag status={candidacy.status} />}
            {candidacy && candidacy.status === 'QUEUED' && (
              <Tag category="gray">Pos. {candidacy.queuePosition}</Tag>
            )}
          </div>
          {candidacy && candidacy.status === 'APPROVED' && (
            <span className="text-muted-foreground mt-2 text-[13px]">
              Aprovado — verifique seus turnos pendentes.
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {candidacy?.status === 'QUEUED' ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
          >
            {withdrawMutation.isPending ? 'Retirando…' : 'Retirar candidatura'}
          </Button>
        ) : canApply ? (
          <Button
            type="button"
            variant="solid"
            size="md"
            onClick={handleApply}
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? 'Inscrevendo…' : 'Sou voluntário'}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
