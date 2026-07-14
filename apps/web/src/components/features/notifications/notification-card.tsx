'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Tag } from '~/components/ui/tag'
import { cn } from '~/lib/utils'

import type { NotificationRow } from './_hooks/_lib/types'
import { getMetaFor } from './notification-meta'

interface Props {
  notification: NotificationRow
  principalUserId: string
  onSelect: (n: NotificationRow) => void
}

export function NotificationCard({
  notification,
  principalUserId,
  onSelect,
}: Props) {
  const meta = getMetaFor(notification.type)
  const date = new Date(notification.createdAt)
  const relative = formatDistanceToNow(date, {
    addSuffix: true,
    locale: ptBR,
  })
  const absolute = format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  const isUnread = notification.readAt === null
  const Icon = meta.Icon

  const copy = meta.copy(notification.payload, principalUserId)

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        'group border-border hover:bg-muted focus-visible:ring-ring flex w-full items-start gap-3 rounded-[10px] border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isUnread && 'bg-blue-50/50',
      )}
      aria-label={`${meta.label}: ${copy}`}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-[8px]',
          'bg-muted text-foreground',
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Tag category={meta.category}>{meta.label}</Tag>
          {isUnread && (
            <span
              aria-label="Não lida"
              className="inline-block size-2 rounded-full bg-blue-600"
            />
          )}
        </span>
        <span className="text-foreground line-clamp-2 text-[14px]">{copy}</span>
        <span className="text-muted-foreground text-[12px]" title={absolute}>
          {relative}
        </span>
      </span>
    </button>
  )
}
