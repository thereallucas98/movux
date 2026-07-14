/**
 * Translates the `meta` payload of a `PLAN_LIMIT_REACHED` API error into a
 * single pt-BR description string suitable for `setError('root', { message })`
 * or for an inline alert body.
 *
 * For the `pattern` shape (F06b only), use `parsePlanLimitMeta` to get the
 * description and read the structured `meta.suggestion` directly for the
 * "Ajustar até <date>" button.
 *
 * See `docs/tasks/f13-plan-limits-banners/research.md §8` for the routing
 * decision (`setError('root')` for simple/boolean; inline alert for pattern).
 */

import type { PlanTier } from '~/server/plan-limits/plan-limits.config'

interface SimpleMeta {
  shape: 'simple'
  resource: string
  plan: PlanTier
  limit: number
  current: number
  gracePeriodExpired?: boolean
}

interface BooleanMeta {
  shape: 'boolean'
  resource: string
  plan: PlanTier
  allowed: false
  gracePeriodExpired?: boolean
}

interface PatternMeta {
  shape: 'pattern'
  resource: string
  plan: PlanTier
  perMonth: Record<
    string,
    { existing: number; requested: number; projected: number; limit: number }
  >
  suggestion: { adjustedEndDate: string | Date; wouldGenerate: number }
  gracePeriodExpired?: boolean
}

export type PlanLimitMeta = SimpleMeta | BooleanMeta | PatternMeta

const RESOURCE_LABELS: Record<string, string> = {
  workspacesPerTenant: 'workspaces',
  membersPerWorkspace: 'membros',
  categoriesPerWorkspace: 'setores',
  specialtiesPerWorkspace: 'especialidades',
  activeSchedulesPerWorkspace: 'escalas ativas',
  shiftsPerMonthPerWorkspace: 'plantões/mês',
  requestsPerMonthPerWorkspace: 'solicitações/mês',
  storageMBPerWorkspace: 'armazenamento (MB)',
  attachmentSizeMB: 'tamanho do anexo (MB)',
  tenantScopedCatalogs: 'catálogo no nível do tenant',
}

const PLAN_LABELS: Record<PlanTier, string> = {
  FREE: 'Free',
  SMALL_TEAM: 'Small Team',
  BUSINESS: 'Business',
  CORPORATE: 'Corporate',
}

const NEXT_PLAN: Record<PlanTier, PlanTier | null> = {
  FREE: 'SMALL_TEAM',
  SMALL_TEAM: 'BUSINESS',
  BUSINESS: 'CORPORATE',
  CORPORATE: null,
}

const FALLBACK_DESCRIPTION = 'Limite do plano atingido.'

export function parsePlanLimitMeta(meta: unknown): { description: string } {
  if (!meta || typeof meta !== 'object' || !('shape' in meta)) {
    return { description: FALLBACK_DESCRIPTION }
  }
  const m = meta as PlanLimitMeta
  switch (m.shape) {
    case 'simple':
      return { description: describeSimple(m) }
    case 'boolean':
      return { description: describeBoolean(m) }
    case 'pattern':
      return { description: describePattern(m) }
    default:
      return { description: FALLBACK_DESCRIPTION }
  }
}

function describeSimple(meta: SimpleMeta): string {
  const label = RESOURCE_LABELS[meta.resource] ?? meta.resource
  const planLabel = PLAN_LABELS[meta.plan]
  const next = NEXT_PLAN[meta.plan]
  const upgradeHint = next
    ? ` Faça upgrade para o plano ${PLAN_LABELS[next]}.`
    : ''
  const graceHint = meta.gracePeriodExpired
    ? ' (Período de grace expirou.)'
    : ''
  return `Limite atingido — ${label}: ${meta.current} de ${meta.limit} usado(s) no plano ${planLabel}.${upgradeHint}${graceHint}`
}

function describeBoolean(meta: BooleanMeta): string {
  const label = RESOURCE_LABELS[meta.resource] ?? meta.resource
  return `Recurso "${label}" disponível apenas no plano Corporate. Faça upgrade para usá-lo.`
}

function describePattern(meta: PatternMeta): string {
  const violatingMonth = Object.entries(meta.perMonth).find(
    ([, b]) => b.projected > b.limit,
  )
  if (!violatingMonth) return FALLBACK_DESCRIPTION
  const [monthKey, bucket] = violatingMonth
  const adjusted =
    typeof meta.suggestion.adjustedEndDate === 'string'
      ? meta.suggestion.adjustedEndDate
      : meta.suggestion.adjustedEndDate.toISOString().slice(0, 10)
  return `Padrão excede o limite mensal. Mês ${monthKey} estouraria com ${bucket.projected}/${bucket.limit} plantões. Sugestão: encurtar até ${adjusted} (${meta.suggestion.wouldGenerate} plantões).`
}
