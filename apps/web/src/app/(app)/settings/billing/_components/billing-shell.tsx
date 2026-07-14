'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'

import { PlanCard } from '~/components/features/plan-limits/plan-card'
import { ResourceProgressBar } from '~/components/features/plan-limits/resource-progress-bar'
import { useChangeTenantPlan } from '~/components/features/settings/_hooks/use-change-tenant-plan'
import { useTenantPlanLimits } from '~/components/features/settings/_hooks/use-tenant-plan-limits'
import { useWorkspacePlanLimits } from '~/components/features/settings/_hooks/use-workspace-plan-limits'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import type { PlanTier } from '~/server/plan-limits/plan-limits.config'
import { handlePlanLimitError } from '~/components/features/plan-limits/with-plan-limit-error-handler'

// Corporate is intentionally hidden from the self-service picker — handled
// via "fale com vendas" link below the grid (Phase 3 enterprise sales motion).
const PLAN_TIERS: PlanTier[] = ['FREE', 'SMALL_TEAM', 'BUSINESS']
const RESOURCE_LABELS_TENANT = {
  workspaces: 'Workspaces',
} as const
const RESOURCE_LABELS_WS = {
  members: 'Membros',
  categories: 'Setores',
  specialties: 'Especialidades',
  activeSchedules: 'Escalas ativas',
  shiftsThisMonth: 'Plantões / mês',
  requestsThisMonth: 'Solicitações / mês',
  storageMB: 'Armazenamento (MB)',
} as const

interface Props {
  tenantId: string
  workspaceId: string
}

export function BillingShell({ tenantId, workspaceId }: Props) {
  const tenant = useTenantPlanLimits(tenantId)
  const workspace = useWorkspacePlanLimits(workspaceId)
  const change = useChangeTenantPlan()

  const [pendingPlan, setPendingPlan] = useState<PlanTier | null>(null)
  const [violations, setViolations] = useState<
    Array<{ resource: string; current: number; newLimit: number | null }>
  >([])
  const [confirmGrace, setConfirmGrace] = useState<string | null>(null)

  if (!tenant.data) {
    return <p className="text-muted-foreground text-sm">Carregando…</p>
  }

  const currentPlan = tenant.data.plan
  const grace = tenant.data.gracePeriodUntil
    ? new Date(tenant.data.gracePeriodUntil)
    : null
  const inGrace = grace !== null && grace > new Date()

  function handleSelect(tier: PlanTier) {
    if (tier === currentPlan) return
    change.mutate(
      { tenantId, plan: tier },
      {
        onSuccess: (data) => {
          if (data.violations.length > 0 && data.gracePeriodUntil) {
            setPendingPlan(data.plan)
            setViolations(data.violations)
            setConfirmGrace(data.gracePeriodUntil)
          }
        },
        onError: (err) => {
          handlePlanLimitError(err, {
            onSimpleOrBoolean: (msg) => toast.error(msg),
            onOtherError: (e) => toast.error(e.message),
          })
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Plano</h1>
        <p className="text-muted-foreground text-sm">
          Veja seu plano atual, uso por recurso e altere para um plano maior ou
          menor.
        </p>
      </header>

      <section className="border-primary/20 from-primary/5 flex flex-col gap-3 rounded-lg border bg-gradient-to-br to-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-primary text-xs font-medium tracking-wide uppercase">
              Plano atual
            </p>
            <p className="text-2xl font-bold">{currentPlan}</p>
          </div>
          {inGrace && grace && (
            <div className="bg-warning-light border-warning/50 text-yellow-dark rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">Grace ativo</span> — expira em{' '}
              {formatDistanceToNow(grace, { locale: ptBR })}
            </div>
          )}
        </div>
      </section>

      <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex items-center gap-2">
          <span className="bg-primary inline-block h-1 w-6 rounded-full" />
          <h2 className="text-base font-semibold">Uso — Tenant</h2>
        </div>
        {Object.entries(RESOURCE_LABELS_TENANT).map(([key, label]) => {
          const slot = tenant.data?.resources[
            key as keyof typeof tenant.data.resources
          ] as
            | {
                limit: number | null
                current: number
                percent: number | null
                exhausted: boolean
              }
            | undefined
          if (!slot || typeof slot !== 'object' || !('current' in slot))
            return null
          return (
            <ResourceProgressBar
              key={key}
              label={label}
              current={slot.current}
              limit={slot.limit}
              percent={slot.percent}
              exhausted={slot.exhausted}
            />
          )
        })}
      </section>

      {workspace.data && (
        <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <span className="bg-primary inline-block h-1 w-6 rounded-full" />
            <h2 className="text-base font-semibold">Uso — Workspace atual</h2>
          </div>
          {Object.entries(RESOURCE_LABELS_WS).map(([key, label]) => {
            const slot =
              workspace.data?.resources[
                key as keyof typeof workspace.data.resources
              ]
            if (!slot) return null
            return (
              <ResourceProgressBar
                key={key}
                label={label}
                current={slot.current}
                limit={slot.limit}
                percent={slot.percent}
                exhausted={slot.exhausted}
              />
            )
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary inline-block h-1 w-6 rounded-full" />
          <h2 className="text-base font-semibold">Mudar plano</h2>
        </div>
        {/* Desktop grid */}
        <div className="hidden gap-4 md:grid md:grid-cols-3 lg:gap-6">
          {PLAN_TIERS.map((tier) => (
            <PlanCard
              key={tier}
              tier={tier}
              isCurrent={tier === currentPlan}
              onSelect={() => handleSelect(tier)}
            />
          ))}
        </div>
        {/* Mobile carousel */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden">
          {PLAN_TIERS.map((tier) => (
            <PlanCard
              key={tier}
              tier={tier}
              isCurrent={tier === currentPlan}
              onSelect={() => handleSelect(tier)}
              className="shrink-0 basis-[280px] snap-center"
            />
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Hospital ou rede com requisitos enterprise (SSO, MTE 671, folha de
          pagamento)?{' '}
          <a
            href="mailto:vendas@movux.com.br?subject=Plano%20enterprise"
            className="text-primary underline-offset-4 hover:underline"
          >
            Fale com a gente
          </a>
          .
        </p>
      </section>

      <Dialog
        open={pendingPlan !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPlan(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade para {pendingPlan}</DialogTitle>
            <DialogDescription>
              Você tem {violations.length} recurso(s) acima do limite do novo
              plano. Você terá até{' '}
              {confirmGrace &&
                formatDistanceToNow(new Date(confirmGrace), {
                  locale: ptBR,
                })}{' '}
              para ajustar.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {violations.map((v) => (
              <li key={v.resource} className="text-muted-foreground">
                <span className="font-medium">{v.resource}</span> — atual{' '}
                {v.current}
                {v.newLimit !== null && `, novo limite ${v.newLimit}`}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPlan(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
