import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Tag } from '~/components/ui/tag'
import { categoryVisual } from '~/lib/format/category-visual'
import { formatShiftStartLabel } from '~/lib/format/date'
import { cn } from '~/lib/utils'
import {
  assignmentRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { listUpcomingShifts } from '~/server/use-cases'

import { DashboardCta } from './dashboard-cta'

interface UpcomingShiftsProps {
  workspaceId: string
  fromAt: Date
  toAt: Date
  timezone: string
  principal: { userId: string; role: string }
  className?: string
}

export async function UpcomingShifts({
  workspaceId,
  fromAt,
  toAt,
  timezone,
  principal,
  className,
}: UpcomingShiftsProps) {
  const result = await listUpcomingShifts(
    workspaceMembershipRepository,
    shiftRepository,
    assignmentRepository,
    principal,
    { workspaceId, fromAt, toAt, limit: 5 },
  )

  return (
    <section
      aria-labelledby="upcoming-shifts-heading"
      className={cn(
        'border-border bg-background flex flex-col overflow-hidden rounded-[12px] border',
        className,
      )}
    >
      <header className="border-border flex items-center justify-between border-b px-6 py-5">
        <h2
          id="upcoming-shifts-heading"
          className="text-muted-foreground text-[12px] leading-[16px] font-medium tracking-[0.6px] uppercase"
        >
          Próximos turnos
        </h2>
        <Link
          href="/shifts"
          className="text-primary inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
        >
          Ver todos
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </header>

      {!result.success || result.data.length === 0 ? (
        <Empty />
      ) : (
        <ul className="flex flex-col">
          {result.data.map((shift) => (
            <UpcomingShiftRow
              key={shift.id}
              shift={shift}
              timezone={timezone}
            />
          ))}
        </ul>
      )}

      <DashboardCta role={principal.role} />
    </section>
  )
}

interface UpcomingShiftRowProps {
  shift: {
    id: string
    categoryId: string
    categoryName: string
    startAt: Date
    headcount: number
    filled: number
  }
  timezone: string
}

function UpcomingShiftRow({ shift, timezone }: UpcomingShiftRowProps) {
  const visual = categoryVisual(shift.categoryId)
  const Icon = visual.Icon

  return (
    <li className="border-border flex items-center border-b last:border-b-0">
      <div className="flex flex-1 items-center gap-4 px-6 py-5">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-[8px]',
            visual.blockClass,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[16px] leading-[24px] font-medium">
            {shift.categoryName}
          </p>
          <p className="text-muted-foreground text-[14px] leading-[20px]">
            {formatShiftStartLabel(shift.startAt, timezone)}
          </p>
        </div>
      </div>
      <div className="hidden w-[160px] justify-center px-6 sm:flex">
        <Tag category={visual.palette}>{shift.categoryName}</Tag>
      </div>
      <div className="text-foreground flex w-[120px] justify-end px-6 text-[14px] font-semibold whitespace-nowrap">
        {shift.filled}/{shift.headcount} vagas
      </div>
    </li>
  )
}

function Empty() {
  return (
    <p className="text-muted-foreground py-12 text-center text-[14px]">
      Nenhum turno nos próximos 7 dias
    </p>
  )
}
