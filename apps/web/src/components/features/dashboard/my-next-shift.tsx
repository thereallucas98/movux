import { CalendarClock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { categoryVisual } from '~/lib/format/category-visual'
import { formatShiftStartLabel } from '~/lib/format/date'
import {
  assignmentRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { getMyNextShift } from '~/server/use-cases'

interface Props {
  workspaceId: string
  timezone: string
  principal: { userId: string; role: string }
}

function diffLabel(target: Date): string {
  const ms = target.getTime() - Date.now()
  if (ms <= 0) return 'agora'
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days >= 1) return `em ${days} ${days === 1 ? 'dia' : 'dias'}`
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours >= 1) return `em ${hours}h`
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)))
  return `em ${minutes}min`
}

export async function MyNextShift({ workspaceId, timezone, principal }: Props) {
  const result = await getMyNextShift(
    workspaceMembershipRepository,
    assignmentRepository,
    principal,
    { workspaceId },
  )
  if (!result.success) return null

  if (!result.data) {
    return (
      <section
        data-slot="my-next-shift"
        className="border-border bg-background flex flex-col gap-2 rounded-[12px] border p-6"
        aria-label="Meu próximo turno"
      >
        <h3 className="text-foreground text-[14px] font-semibold tracking-[0.6px] uppercase">
          Meu próximo turno
        </h3>
        <p className="text-muted-foreground text-[14px]">
          Você não tem turnos confirmados nesta semana. Aceite uma atribuição ou
          candidate-se a um turno aberto.
        </p>
      </section>
    )
  }

  const { startAt, endAt, scheduleId, shiftId, categoryId } = result.data
  const visual = categoryVisual(categoryId)
  const startLabel = formatShiftStartLabel(new Date(startAt), timezone)
  const endLabel = formatShiftStartLabel(new Date(endAt), timezone)
  const countdown = diffLabel(new Date(startAt))

  return (
    <Link
      href={`/schedules/${scheduleId}/shifts/${shiftId}`}
      data-slot="my-next-shift"
      className="border-border bg-background hover:bg-accent group flex flex-col gap-3 rounded-[12px] border p-6 transition-colors"
      aria-label="Ver detalhe do meu próximo turno"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-[14px] font-semibold tracking-[0.6px] uppercase">
          Meu próximo turno
        </h3>
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[12px]">
          <CalendarClock className="size-3.5" aria-hidden />
          {countdown}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex size-12 shrink-0 items-center justify-center rounded-[10px] ${visual.blockClass}`}
        >
          <visual.Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-foreground truncate text-[16px] font-semibold">
            {startLabel} – {endLabel}
          </p>
          <p className="text-muted-foreground text-[13px]">
            Toque para ver a timeline e bater ponto
          </p>
        </div>
        <ChevronRight
          className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  )
}
