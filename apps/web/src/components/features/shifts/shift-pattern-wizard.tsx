'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { Type } from '~/components/ui/type'
import type { PlanLimitMeta } from '~/components/features/plan-limits/parse-plan-limit-meta'
import { PatternSuggestionAlert } from '~/components/features/plan-limits/pattern-suggestion-alert'
import { handlePlanLimitError } from '~/components/features/plan-limits/with-plan-limit-error-handler'
import { ApiError } from '~/lib/api-error'
import { fromMinutes } from '~/lib/format/time'

import {
  PatternStepDefine,
  type PatternDefinition,
} from './pattern-step-define'
import { PatternStepRange } from './pattern-step-range'
import type { ShiftPattern } from './_hooks/use-shift-patterns'
import { useCreateAndGenerateShifts } from './_hooks/use-create-and-generate-shifts'
import { useGenerateShiftsFromPattern } from './_hooks/use-generate-shifts-from-pattern'

interface Props {
  workspaceId: string
  scheduleId: string
  schedulePeriod: { start: Date; end: Date }
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Range {
  rangeStart: Date
  rangeEnd: Date
}

function buildSuccessToast(generated: number, skipped: number): string {
  if (generated === 0 && skipped === 0) {
    return 'Nenhum turno foi gerado para esse intervalo.'
  }
  if (generated === 0) {
    return `Nenhum turno novo (${skipped} já existiam).`
  }
  if (skipped === 0) {
    return `Foram gerados ${generated} turno(s).`
  }
  return `Foram gerados ${generated} turno(s) (${skipped} já existiam).`
}

export function ShiftPatternWizard({
  workspaceId,
  scheduleId,
  schedulePeriod,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [definition, setDefinition] = useState<PatternDefinition | null>(null)
  const [range, setRange] = useState<Range | null>(null)
  const [savedPattern, setSavedPattern] = useState<ShiftPattern | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [patternMeta, setPatternMeta] = useState<Extract<
    PlanLimitMeta,
    { shape: 'pattern' }
  > | null>(null)

  const orchestrator = useCreateAndGenerateShifts(workspaceId, scheduleId)
  const generateOnly = useGenerateShiftsFromPattern(workspaceId, scheduleId)

  const isSubmitting = orchestrator.isPending || generateOnly.isPending

  function handleClose() {
    onOpenChange(false)
    // Reset on next open via mount/unmount; nothing to do here.
  }

  async function handleSubmit() {
    if (!range) return
    setSubmitError(null)
    setRangeError(null)

    try {
      let result: { generated: number; skipped: number }
      if (savedPattern) {
        result = await generateOnly.mutateAsync({
          patternId: savedPattern.id,
          rangeStart: range.rangeStart.toISOString(),
          rangeEnd: range.rangeEnd.toISOString(),
        })
      } else {
        if (!definition) return
        result = await orchestrator.mutateAsync({
          definition,
          range: {
            rangeStart: range.rangeStart.toISOString(),
            rangeEnd: range.rangeEnd.toISOString(),
          },
        })
      }

      toast.success(buildSuccessToast(result.generated, result.skipped))
      queryClient.invalidateQueries({ queryKey: ['shifts', scheduleId] })
      queryClient.invalidateQueries({
        queryKey: ['shift-patterns', scheduleId],
      })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta escala não está mais em rascunho.')
        queryClient.invalidateQueries({ queryKey: ['shifts', scheduleId] })
        onOpenChange(false)
        return
      }
      if (code === 'PATTERN_RANGE_TOO_LARGE') {
        setRangeError('Intervalo máximo de 90 dias.')
        return
      }
      if (code === 'SHIFT_TIME_INVALID') {
        toast.error('Horário do padrão inválido.')
        setStep(1)
        return
      }
      if (code === 'NOT_FOUND') {
        toast.error('Escala ou categoria não encontrada.')
        return
      }
      if (code === 'PLAN_LIMIT_REACHED') {
        handlePlanLimitError(err, {
          onPattern: (meta) => setPatternMeta(meta),
          onSimpleOrBoolean: (msg) => setSubmitError(msg),
        })
        return
      }
      setSubmitError('Não foi possível gerar os turnos. Tente novamente.')
    }
  }

  const stepDescription = `Passo ${step} de 2`

  const footer =
    step === 1 ? (
      <div className="flex w-full justify-end gap-2">
        <Button type="button" variant="outline" size="md" onClick={handleClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="solid"
          size="md"
          disabled={!definition && !savedPattern}
          onClick={() => setStep(2)}
        >
          Próximo
        </Button>
      </div>
    ) : (
      <div className="flex w-full justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => setStep(1)}
          disabled={isSubmitting}
        >
          Voltar
        </Button>
        <Button
          type="button"
          variant="solid"
          size="md"
          disabled={!range || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Gerando…' : 'Gerar'}
        </Button>
      </div>
    )

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gerar turnos por padrão"
      description={stepDescription}
      breakpoint="mobileOrTablet"
      contentClassName="md:max-w-[36rem] lg:max-w-[52rem]"
      footer={footer}
    >
      {step === 1 ? (
        <>
          <PatternStepDefine
            workspaceId={workspaceId}
            scheduleId={scheduleId}
            initial={
              savedPattern
                ? {
                    categoryId: savedPattern.categoryId,
                    name: savedPattern.name ?? '',
                    daysOfWeek: [...savedPattern.daysOfWeek].sort(
                      (a, b) => a - b,
                    ),
                    startTime: fromMinutes(savedPattern.startTimeMinutes),
                    endTime: fromMinutes(savedPattern.endTimeMinutes),
                    crossesMidnight: savedPattern.crossesMidnight,
                    headcount: savedPattern.headcount,
                  }
                : null
            }
            selectedSavedPatternId={savedPattern?.id ?? null}
            onSelectSavedPattern={(p) => setSavedPattern(p)}
            onChange={(def) => setDefinition(def)}
          />
          {submitError && <Type variant="danger">{submitError}</Type>}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <PatternStepRange
            defaultRange={schedulePeriod}
            onChange={(r) => setRange(r)}
          />
          {rangeError && (
            <span className="text-destructive text-[13px] font-medium">
              {rangeError}
            </span>
          )}
          {patternMeta && (
            <PatternSuggestionAlert
              meta={patternMeta}
              onAdjust={(adjusted) => {
                if (range) {
                  setRange({ ...range, rangeEnd: adjusted })
                }
                setPatternMeta(null)
              }}
            />
          )}
          {submitError && <Type variant="danger">{submitError}</Type>}
        </div>
      )}
    </AdaptiveDialog>
  )
}
