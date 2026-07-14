import { redirect } from 'next/navigation'

import { InboxRequestsList } from '~/components/features/requests/inbox-requests-list'

import { resolveRequestsContext } from '../_data'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<{ ws?: string }>
}

export default async function RequestsInboxPage({ searchParams }: PageProps) {
  const ctx = await resolveRequestsContext(searchParams)
  if (!['ADMIN', 'COORDENADOR'].includes(ctx.myMembershipRole)) {
    redirect('/requests')
  }
  return (
    <InboxRequestsList
      workspaceId={ctx.workspaceId}
      workspaceTimezone={ctx.workspaceTimezone}
      meId={ctx.principal.userId}
    />
  )
}
