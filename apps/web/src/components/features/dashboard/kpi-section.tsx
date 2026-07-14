import { ArrowUpCircle, Inbox, Wallet } from 'lucide-react'

import { formatPercent } from '~/lib/format/date'
import {
  assignmentRepository,
  requestRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { getDashboardKpis } from '~/server/use-cases'

import { KpiCard } from './kpi-card'

interface KpiSectionProps {
  workspaceId: string
  fromAt: Date
  toAt: Date
  principal: { userId: string; role: string }
}

export async function KpiSection({
  workspaceId,
  fromAt,
  toAt,
  principal,
}: KpiSectionProps) {
  const result = await getDashboardKpis(
    workspaceMembershipRepository,
    shiftRepository,
    assignmentRepository,
    requestRepository,
    principal,
    { workspaceId, fromAt, toAt },
  )

  if (!result.success) {
    return <KpisError />
  }

  const { shiftsThisWeek, filledTotals, pendingRequests } = result.data

  return (
    <div className="grid gap-4 md:grid-cols-3" aria-label="Indicadores">
      <KpiCard
        icon={<Wallet className="size-5" aria-hidden />}
        label="Turnos esta semana"
        value={String(shiftsThisWeek)}
      />
      <KpiCard
        icon={<ArrowUpCircle className="size-5" aria-hidden />}
        label="Turnos preenchidos"
        value={formatPercent(filledTotals.filled, filledTotals.total)}
      />
      <KpiCard
        icon={<Inbox className="size-5" aria-hidden />}
        label="Solicitações pendentes"
        value={String(pendingRequests)}
      />
    </div>
  )
}

function KpisError() {
  return (
    <div className="border-border bg-muted text-muted-foreground rounded-[12px] border p-6 text-center text-sm">
      Não foi possível carregar os indicadores.
    </div>
  )
}
