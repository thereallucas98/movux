import Link from 'next/link'

import { NotificationsList } from '~/components/features/notifications/notifications-list'
import { cn } from '~/lib/utils'

import { resolveNotificationsContext } from './_data'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const ctx = await resolveNotificationsContext()
  const sp = (await searchParams) ?? {}
  const status = sp.status === 'all' ? 'all' : 'unread'

  const tabClass = (active: boolean) =>
    cn(
      'rounded-button px-4 py-1.5 text-[14px] font-medium transition-colors',
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted',
    )

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-[24px] font-semibold">
          Notificações
        </h1>
        <p className="text-muted-foreground text-[14px]">
          Eventos recentes do seu workspace.
        </p>
      </header>

      <nav
        aria-label="Filtro de notificações"
        className="bg-muted/50 rounded-button inline-flex w-fit gap-1 p-1"
      >
        <Link
          href="/notifications?status=unread"
          className={tabClass(status === 'unread')}
        >
          Não lidas
        </Link>
        <Link
          href="/notifications?status=all"
          className={tabClass(status === 'all')}
        >
          Todas
        </Link>
      </nav>

      <NotificationsList
        status={status}
        principalUserId={ctx.principal.userId}
      />
    </section>
  )
}
