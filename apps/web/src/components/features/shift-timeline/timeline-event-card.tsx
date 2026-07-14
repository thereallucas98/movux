'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import {
  EVENT_META,
  FALLBACK_EVENT_META,
  ShiftTimelineEventTag,
  type ShiftTimelineEventType,
} from './shift-timeline-event-tag'

export interface TimelineEvent {
  id: string
  type: ShiftTimelineEventType
  actorUserId: string | null
  actorName: string | null
  occurredAt: string
  payload: Record<string, unknown> | null
}

export function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const meta = EVENT_META[event.type] ?? FALLBACK_EVENT_META
  const date = new Date(event.occurredAt)
  const relative = formatDistanceToNow(date, {
    addSuffix: true,
    locale: ptBR,
  })
  const absolute = format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  const body = meta.renderBody?.(event.payload) ?? null

  return (
    <article className="border-border bg-background flex flex-col gap-2 rounded-[10px] border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <ShiftTimelineEventTag type={event.type} />
        <span className="text-foreground text-[13px] font-medium">
          {event.actorName ?? '—'}
        </span>
        <span className="text-muted-foreground text-[12px]" title={absolute}>
          {relative}
        </span>
      </header>
      {body && (
        <p className="text-foreground text-[14px] whitespace-pre-wrap">
          {body}
        </p>
      )}
    </article>
  )
}
