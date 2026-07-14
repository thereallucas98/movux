'use client'

import { Lightbulb } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'

import type { PlanLimitMeta } from './parse-plan-limit-meta'

type PatternMeta = Extract<PlanLimitMeta, { shape: 'pattern' }>

export interface PatternSuggestionAlertProps {
  meta: PatternMeta
  onAdjust: (adjustedEndDate: Date) => void
}

export function PatternSuggestionAlert({
  meta,
  onAdjust,
}: PatternSuggestionAlertProps) {
  const violatingMonth = Object.entries(meta.perMonth).find(
    ([, b]) => b.projected > b.limit,
  )
  if (!violatingMonth) return null
  const [monthKey, bucket] = violatingMonth

  const adjusted =
    typeof meta.suggestion.adjustedEndDate === 'string'
      ? new Date(meta.suggestion.adjustedEndDate)
      : meta.suggestion.adjustedEndDate
  const adjustedLabel = adjusted.toISOString().slice(0, 10)

  return (
    <Alert variant="warning" role="status">
      <Lightbulb className="h-4 w-4" />
      <AlertTitle>Padrão excede o limite mensal</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>
          Mês de <strong>{monthKey}</strong> estouraria com {bucket.projected}/
          {bucket.limit} plantões. Sugestão: encurtar até{' '}
          <strong>{adjustedLabel}</strong> ({meta.suggestion.wouldGenerate}{' '}
          plantões).
        </span>
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAdjust(adjusted)}
          >
            Ajustar até {adjustedLabel}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
