'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '~/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'

import type { NotificationRow } from './_hooks/_lib/types'
import { useMarkAllNotificationsRead } from './_hooks/use-mark-all-notifications-read'
import { useMarkNotificationRead } from './_hooks/use-mark-notification-read'
import { useRecentNotifications } from './_hooks/use-my-notifications'
import { NotificationCard } from './notification-card'
import { getMetaFor } from './notification-meta'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  principalUserId: string
}

export function NotificationsQuickView({
  open,
  onOpenChange,
  principalUserId,
}: Props) {
  const router = useRouter()
  const recentQuery = useRecentNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  function handleSelect(n: NotificationRow) {
    const meta = getMetaFor(n.type)
    const target = meta.deepLink(n.payload, principalUserId)
    if (n.readAt === null) {
      markRead.mutate(n.id)
    }
    onOpenChange(false)
    router.push(target)
  }

  const items = recentQuery.data ?? []
  const hasUnread = items.some((n) => n.readAt === null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] gap-0 px-0 pt-4 pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2 px-4 pt-1 pb-3">
          <SheetTitle className="text-foreground text-[16px] font-semibold">
            Notificações
          </SheetTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={!hasUnread || markAll.isPending}
          >
            Marcar todas
          </Button>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4">
          {recentQuery.isLoading && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Carregando…
            </p>
          )}
          {recentQuery.isSuccess && items.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhuma notificação ainda.
            </p>
          )}
          {items.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              principalUserId={principalUserId}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="border-border mt-3 border-t px-4 py-3">
          <Link
            href="/notifications"
            onClick={() => onOpenChange(false)}
            className="text-foreground inline-flex w-full items-center justify-center text-sm font-medium hover:underline"
          >
            Ver todas
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
