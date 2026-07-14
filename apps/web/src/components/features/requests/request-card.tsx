'use client'

import { Paperclip } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { formatShiftStartLabel } from '~/lib/format/date'
import { formatPeriodRange } from '~/lib/format/date-range'

import type { RequestWithRelationsRow } from './_hooks/use-requests'
import { RequestStatusTag } from './request-status-tag'
import { RequestTypeTag } from './request-type-tag'

interface Props {
  request: RequestWithRelationsRow
  variant: 'mine' | 'inbox'
  meId: string
  workspaceTimezone: string
  onCancel?: (id: string) => void
  onResolve?: (request: RequestWithRelationsRow) => void
  onPeerRespond?: (id: string, decision: 'ACCEPT' | 'REJECT') => void
}

function summarize(r: RequestWithRelationsRow, tz: string): string {
  if (r.type === 'SWAP') {
    const a = r.swapSourceAssignment
    const b = r.swapTargetAssignment
    const aLabel = a
      ? `${formatShiftStartLabel(new Date(a.shift.startAt), tz)} – ${formatShiftStartLabel(new Date(a.shift.endAt), tz)}`
      : '—'
    const bLabel = b
      ? `${formatShiftStartLabel(new Date(b.shift.startAt), tz)} – ${formatShiftStartLabel(new Date(b.shift.endAt), tz)}`
      : '—'
    return `${aLabel} ↔ ${bLabel}`
  }
  if (r.type === 'OFFER') {
    const a = r.offerSourceAssignment
    return a
      ? `${formatShiftStartLabel(new Date(a.shift.startAt), tz)} – ${formatShiftStartLabel(new Date(a.shift.endAt), tz)}`
      : '—'
  }
  // TIME_OFF
  if (r.timeOffStart && r.timeOffEnd) {
    return formatPeriodRange(
      new Date(r.timeOffStart),
      new Date(r.timeOffEnd),
      tz,
    )
  }
  return '—'
}

export function RequestCard({
  request: r,
  variant,
  meId,
  workspaceTimezone,
  onCancel,
  onResolve,
  onPeerRespond,
}: Props) {
  const summary = summarize(r, workspaceTimezone)

  const canCancel =
    variant === 'mine' &&
    (r.status === 'PENDING' || r.status === 'PENDING_PEER') &&
    r.requestedById === meId

  const canResolve = variant === 'inbox' && r.status === 'PENDING'

  const isPeerRespondMine =
    variant === 'mine' &&
    r.status === 'PENDING_PEER' &&
    r.swapTargetUserId === meId

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RequestTypeTag type={r.type} />
        <RequestStatusTag status={r.status} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-foreground text-[14px] font-medium">
          {summary}
        </span>
        <span className="text-muted-foreground line-clamp-2 text-[13px]">
          {r.reason}
        </span>
      </div>

      {r.attachmentUrl && (
        <a
          href={r.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground inline-flex items-center gap-1 text-[13px] underline-offset-4 hover:underline"
        >
          <Paperclip className="size-3.5" aria-hidden />
          Ver anexo
        </a>
      )}

      {r.resolutionReason && (
        <span className="text-muted-foreground text-[13px]">
          Resolução: {r.resolutionReason}
        </span>
      )}

      {(canCancel || canResolve || isPeerRespondMine) && (
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {isPeerRespondMine && onPeerRespond && (
            <>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => onPeerRespond(r.id, 'REJECT')}
              >
                Rejeitar troca
              </Button>
              <Button
                type="button"
                variant="solid"
                size="md"
                onClick={() => onPeerRespond(r.id, 'ACCEPT')}
              >
                Aceitar troca
              </Button>
            </>
          )}
          {canCancel && onCancel && !isPeerRespondMine && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onCancel(r.id)}
            >
              Cancelar
            </Button>
          )}
          {canResolve && onResolve && (
            <>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => onResolve(r)}
              >
                Resolver
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
