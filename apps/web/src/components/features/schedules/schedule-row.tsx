'use client'

import { ChevronRight, MoreVertical } from 'lucide-react'
import Link from 'next/link'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { IconButton } from '~/components/ui/icon-button'
import { Button } from '~/components/ui/button'
import { Tag } from '~/components/ui/tag'
import { categoryVisual } from '~/lib/format/category-visual'
import { formatPeriodRange } from '~/lib/format/date-range'
import { cn } from '~/lib/utils'

import { CloseScheduleDialog } from './close-schedule-dialog'
import { DeleteScheduleDialog } from './delete-schedule-dialog'
import { PublishScheduleDialog } from './publish-schedule-dialog'
import { ScheduleStatusTag } from './schedule-status-tag'
import type { ScheduleRow as ScheduleRowData } from './_hooks/use-schedules'

interface Props {
  workspaceId: string
  schedule: ScheduleRowData & { categoryName?: string }
  workspaceTimezone: string
  isAdmin: boolean
  variant: 'card' | 'row'
  onEdit: (schedule: ScheduleRowData) => void
}

function displayName(schedule: ScheduleRowData, tz: string): string {
  if (schedule.name) return schedule.name
  return formatPeriodRange(
    new Date(schedule.periodStart),
    new Date(schedule.periodEnd),
    tz,
  )
}

export function ScheduleRow({
  workspaceId,
  schedule,
  workspaceTimezone,
  isAdmin,
  variant,
  onEdit,
}: Props) {
  const periodLabel = formatPeriodRange(
    new Date(schedule.periodStart),
    new Date(schedule.periodEnd),
    workspaceTimezone,
  )
  const visual = categoryVisual(schedule.categoryId)
  const name = displayName(schedule, workspaceTimezone)

  const isDraft = schedule.status === 'DRAFT'
  const isPublished = schedule.status === 'PUBLISHED'
  const isClosed = schedule.status === 'CLOSED'

  // Inline CTA for admin + non-closed.
  const inlineCta =
    isAdmin && isDraft ? (
      <PublishScheduleDialog
        workspaceId={workspaceId}
        schedule={{ id: schedule.id, name: schedule.name }}
        trigger={
          <Button type="button" variant="solid" size="sm">
            Publicar
          </Button>
        }
      />
    ) : isAdmin && isPublished ? (
      <CloseScheduleDialog
        workspaceId={workspaceId}
        schedule={{ id: schedule.id, name: schedule.name }}
        trigger={
          <Button type="button" variant="outline" size="sm">
            Encerrar
          </Button>
        }
      />
    ) : null

  // Kebab items per status.
  const showKebab = isAdmin && !isClosed
  const kebab = showKebab ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="outline"
          size="sm"
          aria-label={`Ações para ${name}`}
        >
          <MoreVertical />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onEdit(schedule)
          }}
        >
          Editar
        </DropdownMenuItem>
        {isDraft && (
          <PublishScheduleDialog
            workspaceId={workspaceId}
            schedule={{ id: schedule.id, name: schedule.name }}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Publicar
              </DropdownMenuItem>
            }
          />
        )}
        {isPublished && (
          <CloseScheduleDialog
            workspaceId={workspaceId}
            schedule={{ id: schedule.id, name: schedule.name }}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Encerrar
              </DropdownMenuItem>
            }
          />
        )}
        {isDraft && (
          <DeleteScheduleDialog
            workspaceId={workspaceId}
            schedule={{ id: schedule.id, name: schedule.name }}
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
              href={`/schedules/${schedule.id}`}
              className="text-foreground inline-flex min-w-0 items-center gap-1 truncate text-[15px] font-semibold hover:underline"
            >
              <span className="truncate">{name}</span>
              <ChevronRight
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </Link>
            <span className="text-muted-foreground text-[13px]">
              {periodLabel}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {schedule.categoryName && (
                <Tag category={visual.palette}>{schedule.categoryName}</Tag>
              )}
              <ScheduleStatusTag status={schedule.status} />
            </div>
          </div>
          {kebab}
        </div>
        {inlineCta && (
          <div className="border-border border-t pt-3">{inlineCta}</div>
        )}
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
            href={`/schedules/${schedule.id}`}
            className="text-foreground inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
          >
            <span>{name}</span>
            <ChevronRight
              className="text-muted-foreground size-4"
              aria-hidden
            />
          </Link>
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-3 text-[14px]">
        {periodLabel}
      </td>
      <td className="px-4 py-3">
        {schedule.categoryName && (
          <Tag category={visual.palette}>{schedule.categoryName}</Tag>
        )}
      </td>
      <td className="px-4 py-3">
        <ScheduleStatusTag status={schedule.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {inlineCta}
          {kebab}
        </div>
      </td>
    </tr>
  )
}
