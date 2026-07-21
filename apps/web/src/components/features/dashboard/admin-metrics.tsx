'use client'

import { FileClock, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react'
import { MetricCard } from '~/components/ui/metric-card'
import { Skeleton } from '~/components/ui/skeleton'
import { useAdminDashboardMetrics } from '~/graphql/hooks/use-admin-dashboard-metrics'

export function AdminMetrics() {
  const { data: metrics, isLoading } = useAdminDashboardMetrics()

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
        label="Documentos pendentes"
        value={String(metrics.pendingDocuments ?? 0)}
        icon={FileClock}
        iconClassName="bg-orange-light text-orange-dark"
      />
      <MetricCard
        label="Carriers sinalizados"
        value={String(metrics.flaggedCarriers ?? 0)}
        icon={ShieldAlert}
        iconClassName="bg-red-light text-red-dark"
      />
      <MetricCard
        label="Carriers verificados"
        value={String(metrics.verifiedCarriers ?? 0)}
        icon={ShieldCheck}
        iconClassName="bg-green-light text-green-dark"
      />
      <MetricCard
        label="Carriers ativos"
        value={String(metrics.activeCarriers ?? 0)}
        icon={UserCheck}
        iconClassName="bg-blue-light text-blue-dark"
      />
    </div>
  )
}
