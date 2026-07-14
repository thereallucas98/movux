'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'

import { cn } from '~/lib/utils'

import { useUnreadNotificationCount } from './_hooks/use-unread-count'
import { NotificationsQuickView } from './notifications-quick-view'

interface Props {
  principalUserId: string
  className?: string
}

export function NotificationBell({ principalUserId, className }: Props) {
  const [open, setOpen] = useState(false)
  const countQuery = useUnreadNotificationCount()
  const count = countQuery.data?.count ?? 0
  const label = count > 9 ? '9+' : String(count)

  return (
    <>
      <button
        type="button"
        aria-label={
          count > 0 ? `Notificações (${count} não lidas)` : 'Notificações'
        }
        onClick={() => setOpen(true)}
        className={cn(
          'text-foreground hover:bg-accent focus-visible:ring-ring relative flex size-10 cursor-pointer items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none',
          className,
        )}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] leading-[18px] font-bold text-white"
          >
            {label}
          </span>
        )}
      </button>

      <NotificationsQuickView
        open={open}
        onOpenChange={setOpen}
        principalUserId={principalUserId}
      />
    </>
  )
}
