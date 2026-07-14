import { CheckCheck, Inbox, ThumbsUp, Users } from 'lucide-react'

import { KpiCard } from '~/components/features/dashboard/kpi-card'
import {
  assignmentRepository,
  requestRepository,
  shiftCandidateRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { getDashboardExtras } from '~/server/use-cases'

interface Props {
  workspaceId: string
  principal: { userId: string; role: string }
}

function fmtPercent(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

export async function DashboardExtras({ workspaceId, principal }: Props) {
  const result = await getDashboardExtras(
    workspaceMembershipRepository,
    assignmentRepository,
    shiftCandidateRepository,
    requestRepository,
    principal,
    { workspaceId },
  )
  if (!result.success) return null

  const { acceptanceRate, candidatesQueued, activeMembers } = result.data

  return (
    <div className="grid gap-4 md:grid-cols-3" aria-label="Indicadores extras">
      <KpiCard
        icon={<ThumbsUp className="size-5" aria-hidden />}
        label="Taxa de aceite (14d)"
        value={fmtPercent(acceptanceRate.rate)}
      />
      <KpiCard
        icon={<Inbox className="size-5" aria-hidden />}
        label="Candidatos na fila"
        value={String(candidatesQueued)}
      />
      <KpiCard
        icon={<Users className="size-5" aria-hidden />}
        label="Membros ativos"
        value={String(activeMembers)}
      />
    </div>
  )
}

export async function OpenRequestsBreakdown({ workspaceId, principal }: Props) {
  const result = await getDashboardExtras(
    workspaceMembershipRepository,
    assignmentRepository,
    shiftCandidateRepository,
    requestRepository,
    principal,
    { workspaceId },
  )
  if (!result.success) return null
  const { swap, offer, timeOff } = result.data.pendingRequestsByType
  const total = swap + offer + timeOff

  return (
    <section
      data-slot="open-requests-breakdown"
      className="border-border bg-background flex flex-col gap-4 rounded-[12px] border p-6"
      aria-label="Solicitações abertas"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-foreground text-[14px] font-semibold tracking-[0.6px] uppercase">
          Solicitações abertas
        </h3>
        <span className="text-muted-foreground inline-flex items-center gap-2 text-[12px]">
          <CheckCheck className="size-4" aria-hidden />
          {total} no total
        </span>
      </header>
      <div className="grid grid-cols-3 gap-3 text-center">
        <BreakdownStat label="Trocas" value={swap} tone="blue" />
        <BreakdownStat label="Ofertas" value={offer} tone="purple" />
        <BreakdownStat label="Folgas" value={timeOff} tone="pink" />
      </div>
    </section>
  )
}

function BreakdownStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'purple' | 'pink'
}) {
  const map: Record<string, string> = {
    blue: 'bg-blue-light text-blue-dark',
    purple: 'bg-purple-light text-purple-dark',
    pink: 'bg-pink-light text-pink-dark',
  }
  return (
    <div
      className={`rounded-[10px] px-3 py-4 ${map[tone] ?? map.blue}`}
      aria-label={`${value} ${label.toLowerCase()}`}
    >
      <p className="text-2xl leading-none font-bold">{value}</p>
      <p className="mt-1 text-[12px] font-semibold tracking-wider uppercase">
        {label}
      </p>
    </div>
  )
}
