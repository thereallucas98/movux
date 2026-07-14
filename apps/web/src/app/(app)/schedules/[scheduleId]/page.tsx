import { ShiftsList } from '~/components/features/shifts/shifts-list'

import { resolveScheduleDetailContext } from './_data'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ scheduleId: string }>
  searchParams?: Promise<{ ws?: string }>
}

export default async function ScheduleDetailPage({
  params,
  searchParams,
}: PageProps) {
  const ctx = await resolveScheduleDetailContext(searchParams)
  const { scheduleId } = await params
  const isAdmin = ['ADMIN', 'COORDENADOR'].includes(ctx.myMembershipRole)

  return (
    <ShiftsList
      workspaceId={ctx.workspaceId}
      workspaceTimezone={ctx.workspaceTimezone}
      scheduleId={scheduleId}
      isAdmin={isAdmin}
    />
  )
}
