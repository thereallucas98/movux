'use client'

import { Package, Star, Truck, Wallet } from 'lucide-react'
import { MetricCard } from '~/components/ui/metric-card'
import { Skeleton } from '~/components/ui/skeleton'
import { useCustomerDashboardMetrics } from '~/graphql/hooks/use-customer-dashboard-metrics'
import { formatPriceInCents } from '~/lib/format-price'

export function CustomerMetrics() {
  const { data: metrics, isLoading } = useCustomerDashboardMetrics()

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Fretes ativos"
        value={String(metrics.activeShipments ?? 0)}
        icon={Truck}
        iconClassName="bg-blue-light text-blue-dark"
      />
      <MetricCard
        label="Total de fretes"
        value={String(metrics.totalShipments ?? 0)}
        icon={Package}
        iconClassName="bg-purple-light text-purple-dark"
      />
      <MetricCard
        label="Total gasto"
        value={formatPriceInCents(metrics.totalSpentInCents ?? 0)}
        icon={Wallet}
        iconClassName="bg-green-light text-green-dark"
      />
      <MetricCard
        label="Sua avaliação"
        value={metrics.avgRating != null ? metrics.avgRating.toFixed(1) : '—'}
        icon={Star}
        iconClassName="bg-yellow-light text-yellow-dark"
      />
    </div>
  )
}
