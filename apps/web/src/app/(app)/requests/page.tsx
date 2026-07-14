import { MyRequestsList } from '~/components/features/requests/my-requests-list'

import { resolveRequestsContext } from './_data'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<{ ws?: string }>
}

export default async function MyRequestsPage({ searchParams }: PageProps) {
  const ctx = await resolveRequestsContext(searchParams)
  return (
    <MyRequestsList
      workspaceId={ctx.workspaceId}
      workspaceTimezone={ctx.workspaceTimezone}
      meId={ctx.principal.userId}
    />
  )
}
