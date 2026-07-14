'use client'

import { Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { useRecentNotifications } from '~/components/features/notifications/_hooks/use-my-notifications'
import { getMetaFor } from '~/components/features/notifications/notification-meta'
import { Tag } from '~/components/ui/tag'

interface Props {
  principalUserId: string
}

export function RecentNotificationsPanel({ principalUserId }: Props) {
  const query = useRecentNotifications()
  const all = query.data ?? []
  const unread = all.filter((n) => n.readAt === null).slice(0, 3)
  const items = unread.length > 0 ? unread : all.slice(0, 3)

  return (
    <section
      data-slot="recent-notifications-panel"
      className="border-border bg-background flex flex-col gap-3 rounded-[12px] border p-6"
      aria-label="Notificações recentes"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-foreground inline-flex items-center gap-2 text-[14px] font-semibold tracking-[0.6px] uppercase">
          <Bell className="size-4" aria-hidden />
          Recentes
        </h3>
        <Link
          href="/notifications"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[12px] font-medium"
        >
          Ver todas
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      {query.isLoading && (
        <p className="text-muted-foreground py-4 text-center text-[13px]">
          Carregando…
        </p>
      )}

      {query.isSuccess && items.length === 0 && (
        <p className="text-muted-foreground py-4 text-center text-[13px]">
          Sem notificações por enquanto.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((n) => {
          const meta = getMetaFor(n.type)
          const copy = meta.copy(n.payload, principalUserId)
          return (
            <li
              key={n.id}
              className="border-border/70 flex flex-col gap-1.5 rounded-[8px] border p-3"
            >
              <span className="flex flex-wrap items-center gap-2">
                <Tag category={meta.category}>{meta.label}</Tag>
                {n.readAt === null && (
                  <span
                    aria-label="Não lida"
                    className="inline-block size-2 rounded-full bg-blue-600"
                  />
                )}
              </span>
              <span className="text-foreground line-clamp-2 text-[13px]">
                {copy}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
