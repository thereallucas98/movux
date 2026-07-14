'use client'

import { useRouter } from 'next/navigation'

import { Button } from '~/components/ui/button'

import type { NotificationRow } from './_hooks/_lib/types'
import { useMarkAllNotificationsRead } from './_hooks/use-mark-all-notifications-read'
import { useMarkNotificationRead } from './_hooks/use-mark-notification-read'
import { useMyNotifications } from './_hooks/use-my-notifications'
import { NotificationCard } from './notification-card'
import { getMetaFor } from './notification-meta'

interface Props {
  status: 'unread' | 'all'
  principalUserId: string
}

export function NotificationsList({ status, principalUserId }: Props) {
  const router = useRouter()
  const query = useMyNotifications(status)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  function handleSelect(n: NotificationRow) {
    const meta = getMetaFor(n.type)
    const target = meta.deepLink(n.payload, principalUserId)
    if (n.readAt === null) {
      markRead.mutate(n.id)
    }
    router.push(target)
  }

  const items = query.data?.pages.flatMap((p) => p.data) ?? []
  const hasUnread = items.some((n) => n.readAt === null)

  return (
    <section className="flex flex-col gap-4">
      {status === 'unread' && hasUnread && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            Marcar todas como lidas
          </Button>
        </div>
      )}

      {query.isLoading && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Carregando…
        </p>
      )}

      {query.isSuccess && items.length === 0 && (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {status === 'unread'
            ? 'Nenhuma notificação não lida.'
            : 'Nenhuma notificação ainda.'}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((n) => (
          <li key={n.id}>
            <NotificationCard
              notification={n}
              principalUserId={principalUserId}
              onSelect={handleSelect}
            />
          </li>
        ))}
      </ul>

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </section>
  )
}
