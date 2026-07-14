import {
  CategoriesBreakdownSkeleton,
  KpiCardsSkeleton,
  UpcomingShiftsSkeleton,
} from '~/components/features/dashboard/skeletons'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <KpiCardsSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <UpcomingShiftsSkeleton />
        <CategoriesBreakdownSkeleton />
      </div>
    </div>
  )
}
