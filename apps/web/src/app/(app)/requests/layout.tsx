import type { ReactNode } from 'react'

import { RequestsNav } from '~/components/features/requests/requests-nav'

import { resolveRequestsContext } from './_data'

interface LayoutProps {
  children: ReactNode
  searchParams?: Promise<{ ws?: string }>
}

export default async function RequestsLayout({
  children,
  searchParams,
}: LayoutProps) {
  const ctx = await resolveRequestsContext(searchParams)
  const showInbox = ['ADMIN', 'COORDENADOR'].includes(ctx.myMembershipRole)
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-48 lg:shrink-0">
        <RequestsNav showInbox={showInbox} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
