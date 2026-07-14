'use client'

import { Crown, Lock } from 'lucide-react'

import type { PlanTier } from '~/server/plan-limits/plan-limits.config'

const CORPORATE_FEATURES = [
  {
    key: 'tenantScopedCatalogs',
    label: 'Catálogo no nível do tenant',
    description:
      'Crie setores e especialidades padronizados para todos os workspaces do tenant.',
  },
] as const

export interface CorporateFeaturesSectionProps {
  currentPlan: PlanTier
}

export function CorporateFeaturesSection({
  currentPlan,
}: CorporateFeaturesSectionProps) {
  const isCorporate = currentPlan === 'CORPORATE'
  return (
    <section className="border-border flex flex-col gap-3 rounded-lg border p-5">
      <header className="flex items-center gap-2">
        <Crown className="h-4 w-4" aria-hidden />
        <h3 className="text-base font-semibold">
          Recursos exclusivos do plano Corporate
        </h3>
      </header>
      <ul className="flex flex-col gap-3">
        {CORPORATE_FEATURES.map((f) => (
          <li
            key={f.key}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium">{f.label}</span>
              <span className="text-muted-foreground">{f.description}</span>
            </div>
            <span
              className={
                isCorporate
                  ? 'text-primary text-xs font-medium tracking-wide uppercase'
                  : 'text-muted-foreground flex items-center gap-1 text-xs tracking-wide uppercase'
              }
            >
              {isCorporate ? (
                <>✅ Disponível</>
              ) : (
                <>
                  <Lock className="h-3 w-3" aria-hidden /> Faça upgrade
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
