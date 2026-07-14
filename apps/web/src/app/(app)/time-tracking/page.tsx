import { redirect } from 'next/navigation'

import { TimesheetList } from '~/components/features/time-tracking/timesheet-list'

import { resolveTimeTrackingContext } from './_data'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<{ ws?: string }>
}

export default async function TimeTrackingPage({ searchParams }: PageProps) {
  const ctx = await resolveTimeTrackingContext(searchParams)
  if (!['ADMIN', 'COORDENADOR'].includes(ctx.myMembershipRole)) {
    redirect('/dashboard')
  }
  return (
    <TimesheetList
      workspaceId={ctx.workspaceId}
      workspaceTimezone={ctx.workspaceTimezone}
    />
  )
}
