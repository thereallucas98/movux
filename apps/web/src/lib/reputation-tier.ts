import type { BadgeProps } from '~/components/ui/badge'

export interface ReputationTier {
  label: string
  variant: BadgeProps['variant']
}

// Achado #10 da QA momento-zero — selo de reputação por faixa de nota,
// complementar ao badge de tag mais votada (não substitui, os dois convivem).
// Faixas ancoradas nos mesmos cortes já usados em
// carrier-profile.repository.ts#updateRating (< 3.5 = suspenso, < 4.0 =
// sinalizado) pra manter o mesmo vocabulário numérico em todo o domínio.
export function getReputationTier(
  avgRating: number | null | undefined,
): ReputationTier | null {
  if (avgRating == null) return null
  if (avgRating >= 4.5) return { label: 'Excelente', variant: 'success' }
  if (avgRating >= 3.5) return { label: 'Bom', variant: 'secondary' }
  return { label: 'Regular', variant: 'outline' }
}
