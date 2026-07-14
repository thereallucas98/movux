import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

import { ScheduleStatusTag } from '~/components/features/schedules/schedule-status-tag'
import { ShiftAssignmentModeTag } from '~/components/features/shifts/shift-assignment-mode-tag'
import { ShiftTimelineList } from '~/components/features/shift-timeline/shift-timeline-list'
import { Tag } from '~/components/ui/tag'
import { categoryVisual } from '~/lib/format/category-visual'
import { formatShiftStartLabel } from '~/lib/format/date'
import { cn } from '~/lib/utils'

import { resolveShiftDetailContext } from './_data'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ scheduleId: string; shiftId: string }>
  searchParams?: Promise<{ ws?: string }>
}

export default async function ShiftDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { scheduleId, shiftId } = await params
  const ctx = await resolveShiftDetailContext(
    { scheduleId, shiftId },
    searchParams,
  )
  const visual = categoryVisual(ctx.shift.categoryId)
  const startLabel = formatShiftStartLabel(
    ctx.shift.startAt,
    ctx.workspaceTimezone,
  )
  const endLabel = formatShiftStartLabel(ctx.shift.endAt, ctx.workspaceTimezone)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href={`/schedules/${ctx.schedule.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[14px]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Voltar
        </Link>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-[10px]',
              visual.blockClass,
            )}
            aria-hidden
          >
            <visual.Icon className="size-5" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-[24px] leading-[28px] font-bold">
              {startLabel} – {endLabel}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <ScheduleStatusTag
                status={ctx.schedule.status as 'DRAFT' | 'PUBLISHED' | 'CLOSED'}
              />
              <ShiftAssignmentModeTag
                mode={
                  ctx.shift.assignmentMode as 'DIRECT_ASSIGN' | 'OPEN_FOR_APPLY'
                }
              />
              <Tag category="blue">
                {ctx.shift.headcount}{' '}
                {ctx.shift.headcount === 1 ? 'vaga' : 'vagas'}
              </Tag>
            </div>
          </div>
        </div>
      </header>

      <ShiftTimelineList shiftId={ctx.shift.id} canAddNote />
    </section>
  )
}
