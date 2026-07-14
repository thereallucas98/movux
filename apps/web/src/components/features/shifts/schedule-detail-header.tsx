'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

import { Skeleton } from '~/components/ui/skeleton'
import { Tag } from '~/components/ui/tag'
import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { ScheduleStatusTag } from '~/components/features/schedules/schedule-status-tag'
import { categoryVisual } from '~/lib/format/category-visual'
import { formatPeriodRange } from '~/lib/format/date-range'

import { useScheduleDetail } from './_hooks/use-schedule-detail'

interface Props {
  workspaceId: string
  scheduleId: string
  workspaceTimezone: string
}

function BackLink() {
  return (
    <Link
      href="/schedules"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[14px]"
    >
      <ChevronLeft className="size-4" aria-hidden />
      Voltar
    </Link>
  )
}

export function ScheduleDetailHeader({
  workspaceId,
  scheduleId,
  workspaceTimezone,
}: Props) {
  const query = useScheduleDetail(workspaceId, scheduleId)
  const categoriesQuery = useTaxonomies('categories', workspaceId)
  const categoryName = query.data
    ? categoriesQuery.data?.find((c) => c.id === query.data.categoryId)?.name
    : undefined

  if (query.isLoading) {
    return (
      <header className="flex flex-col gap-3">
        <BackLink />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-5 w-48" />
      </header>
    )
  }

  if (query.isError || !query.data) {
    return (
      <header className="flex flex-col gap-3">
        <BackLink />
        <h1 className="text-foreground text-[20px] font-semibold">
          Escala não encontrada
        </h1>
      </header>
    )
  }

  const schedule = query.data
  const periodLabel = formatPeriodRange(
    new Date(schedule.periodStart),
    new Date(schedule.periodEnd),
    workspaceTimezone,
  )
  const visual = categoryVisual(schedule.categoryId)
  const name = schedule.name ?? periodLabel

  return (
    <header className="flex flex-col gap-3">
      <BackLink />
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-[24px] leading-[28px] font-bold">
          {name}
        </h1>
        <span className="text-muted-foreground text-[14px]">{periodLabel}</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ScheduleStatusTag status={schedule.status} />
          {categoryName && <Tag category={visual.palette}>{categoryName}</Tag>}
        </div>
      </div>
    </header>
  )
}
