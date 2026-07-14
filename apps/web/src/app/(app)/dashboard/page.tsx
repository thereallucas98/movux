import { Suspense } from 'react'

import { CategoriesBreakdown } from '~/components/features/dashboard/categories-breakdown'
import {
  DashboardExtras,
  OpenRequestsBreakdown,
} from '~/components/features/dashboard/dashboard-extras'
import { KpiSection } from '~/components/features/dashboard/kpi-section'
import { MyNextShift } from '~/components/features/dashboard/my-next-shift'
import { RecentNotificationsPanel } from '~/components/features/dashboard/recent-notifications-panel'
import {
  CategoriesBreakdownSkeleton,
  KpiCardsSkeleton,
  MyNextShiftSkeleton,
  OpenRequestsSkeleton,
  UpcomingShiftsSkeleton,
} from '~/components/features/dashboard/skeletons'
import { UpcomingShifts } from '~/components/features/dashboard/upcoming-shifts'
import { nextWeekRange } from '~/lib/format/date'

import { resolveDashboardContext } from './_data'

interface DashboardPageProps {
  searchParams?: Promise<{ ws?: string }>
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const ctx = await resolveDashboardContext(searchParams)
  if (!ctx) return null // layout already redirected to onboarding

  const { fromAt, toAt } = nextWeekRange(ctx.timezone)

  return (
    <div className="space-y-6">
      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiSection
          workspaceId={ctx.workspaceId}
          fromAt={fromAt}
          toAt={toAt}
          principal={ctx.principal}
        />
      </Suspense>

      <Suspense fallback={<KpiCardsSkeleton />}>
        <DashboardExtras
          workspaceId={ctx.workspaceId}
          principal={ctx.principal}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<MyNextShiftSkeleton />}>
          <MyNextShift
            workspaceId={ctx.workspaceId}
            timezone={ctx.timezone}
            principal={ctx.principal}
          />
        </Suspense>
        <Suspense fallback={<OpenRequestsSkeleton />}>
          <OpenRequestsBreakdown
            workspaceId={ctx.workspaceId}
            principal={ctx.principal}
          />
        </Suspense>
        <RecentNotificationsPanel principalUserId={ctx.principal.userId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<UpcomingShiftsSkeleton />}>
          <UpcomingShifts
            workspaceId={ctx.workspaceId}
            fromAt={fromAt}
            toAt={toAt}
            timezone={ctx.timezone}
            principal={ctx.principal}
            className="lg:col-span-2"
          />
        </Suspense>
        <Suspense fallback={<CategoriesBreakdownSkeleton />}>
          <CategoriesBreakdown
            workspaceId={ctx.workspaceId}
            fromAt={fromAt}
            toAt={toAt}
            principal={ctx.principal}
          />
        </Suspense>
      </div>
    </div>
  )
}
