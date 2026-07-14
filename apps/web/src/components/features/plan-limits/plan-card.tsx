'use client'

import { Check, Clock } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import {
  PLAN_LIMITS,
  type PlanTier,
} from '~/server/plan-limits/plan-limits.config'
import { cn } from '~/lib/utils'

const PLAN_LABELS: Record<PlanTier, string> = {
  FREE: 'Free',
  SMALL_TEAM: 'Small Team',
  BUSINESS: 'Business',
  CORPORATE: 'Corporate',
}

const PLAN_PRICES_BRL: Record<PlanTier, string> = {
  FREE: 'R$ 0',
  SMALL_TEAM: 'R$ 39',
  BUSINESS: 'R$ 79',
  CORPORATE: 'Sob consulta',
}

export interface PlanCardProps {
  tier: PlanTier
  isCurrent: boolean
  onSelect(): void
  className?: string
}

function fmtNumber(n: number | null): string {
  return n === null ? '∞' : n.toLocaleString('pt-BR')
}

export function PlanCard({
  tier,
  isCurrent,
  onSelect,
  className,
}: PlanCardProps) {
  const limits = PLAN_LIMITS[tier]
  return (
    <Card
      className={cn(
        'flex flex-col gap-4 p-5',
        isCurrent &&
          'border-primary from-primary/5 ring-primary/30 bg-gradient-to-br to-transparent ring-2',
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">{PLAN_LABELS[tier]}</h3>
          {isCurrent && (
            <span className="text-primary text-xs tracking-wide uppercase">
              Atual
            </span>
          )}
        </div>
        <p className="text-2xl font-bold">
          {PLAN_PRICES_BRL[tier]}
          {tier !== 'FREE' && tier !== 'CORPORATE' && (
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              /mês
            </span>
          )}
        </p>
      </header>
      <ul className="flex flex-col gap-2 text-sm">
        <Feature
          label={`${fmtNumber(limits.workspacesPerTenant)} workspace(s)`}
        />
        <Feature
          label={`${fmtNumber(limits.membersPerWorkspace)} membros / workspace`}
        />
        <Feature
          label={`${fmtNumber(limits.categoriesPerWorkspace)} setores · ${fmtNumber(limits.specialtiesPerWorkspace)} especialidades`}
        />
        <Feature
          label={`${fmtNumber(limits.shiftsPerMonthPerWorkspace)} plantões / mês`}
        />
        <Feature
          label={`${fmtNumber(limits.requestsPerMonthPerWorkspace)} solicitações / mês`}
        />
        <Feature
          label={`Anexo até ${fmtNumber(limits.attachmentSizeMB)} MB · ${fmtNumber(limits.storageMBPerWorkspace)} MB total`}
        />
        <Feature label="Login email/senha + Google" comingSoon />
        <Feature label="Sync 2-vias com Google Calendar" comingSoon />
        <Feature label="Notificações in-app + email" comingSoon />
        {tier !== 'FREE' && (
          <Feature label="Geolocalização no ponto" comingSoon />
        )}
        {(tier === 'BUSINESS' || tier === 'CORPORATE') && (
          <Feature label="WhatsApp + bot interativo" comingSoon />
        )}
        {limits.tenantScopedCatalogs && (
          <Feature label="Catálogo no nível do tenant" highlight />
        )}
      </ul>
      <Button
        type="button"
        variant={isCurrent ? 'outline' : 'solid'}
        size="md"
        onClick={onSelect}
        disabled={isCurrent}
        className="mt-auto"
      >
        {isCurrent ? 'Plano atual' : 'Selecionar'}
      </Button>
    </Card>
  )
}

function Feature({
  label,
  highlight,
  comingSoon,
}: {
  label: string
  highlight?: boolean
  comingSoon?: boolean
}) {
  return (
    <li
      className={cn(
        'flex items-start gap-2',
        highlight && 'text-primary font-medium',
      )}
    >
      <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">
        {label}
        {comingSoon && (
          <span className="border-warning/40 bg-warning-light text-yellow-dark ml-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 align-middle text-[10px] font-medium tracking-wide uppercase">
            <Clock className="h-2.5 w-2.5" aria-hidden /> em breve
          </span>
        )}
      </span>
    </li>
  )
}
