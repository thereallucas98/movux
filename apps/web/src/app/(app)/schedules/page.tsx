import { SchedulesList } from '~/components/features/schedules/schedules-list'

import { resolveSchedulesContext } from './_data'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<{
    ws?: string
    status?: string
    categoryId?: string
    from?: string
    to?: string
  }>
}

export default async function SchedulesPage({ searchParams }: PageProps) {
  const ctx = await resolveSchedulesContext(
    searchParams as Promise<{ ws?: string }> | undefined,
  )
  const isAdmin = ['ADMIN', 'COORDENADOR'].includes(ctx.myMembershipRole)

  return (
    <SchedulesList
      workspaceId={ctx.workspaceId}
      workspaceTimezone={ctx.workspaceTimezone}
      isAdmin={isAdmin}
    />
  )
}
