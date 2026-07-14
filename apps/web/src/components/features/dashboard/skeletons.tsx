import { Skeleton } from '~/components/ui/skeleton'

export function KpiCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[112px] rounded-[12px]" />
      ))}
    </div>
  )
}

export function UpcomingShiftsSkeleton() {
  return (
    <div className="border-border bg-background overflow-hidden rounded-[12px] border">
      <Skeleton className="m-6 h-4 w-32" />
      <div className="border-border border-t" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="border-border flex items-center gap-4 border-b px-6 py-5"
        >
          <Skeleton className="size-10 rounded-[8px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
      <div className="px-6 py-5">
        <Skeleton className="mx-auto h-4 w-32" />
      </div>
    </div>
  )
}

export function MyNextShiftSkeleton() {
  return (
    <div className="border-border bg-background flex flex-col gap-3 rounded-[12px] border p-6">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-[10px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  )
}

export function RecentNotificationsSkeleton() {
  return (
    <div className="border-border bg-background flex flex-col gap-3 rounded-[12px] border p-6">
      <Skeleton className="h-4 w-32" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[8px]" />
      ))}
    </div>
  )
}

export function OpenRequestsSkeleton() {
  return (
    <div className="border-border bg-background flex flex-col gap-4 rounded-[12px] border p-6">
      <Skeleton className="h-4 w-40" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-[10px]" />
        ))}
      </div>
    </div>
  )
}

export function CategoriesBreakdownSkeleton() {
  return (
    <div className="border-border bg-background overflow-hidden rounded-[12px] border">
      <Skeleton className="m-6 h-4 w-32" />
      <div className="border-border border-t" />
      <div className="flex flex-col gap-5 p-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <div className="flex-1" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
