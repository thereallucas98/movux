'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { Button } from '~/components/ui/button'
import { DaysOfWeekPicker } from '~/components/ui/days-of-week-picker'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { fromMinutes, toMinutes } from '~/lib/format/time'

import {
  useShiftPatterns,
  type ShiftPattern,
} from './_hooks/use-shift-patterns'

const TIME_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/

const defineSchema = z
  .object({
    categoryId: z.uuid('Selecione uma categoria'),
    name: z
      .string()
      .trim()
      .max(120, 'Máximo 120 caracteres')
      .optional()
      .or(z.literal('')),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Selecione ao menos um dia'),
    startTime: z.string().regex(TIME_REGEX, 'Horário inválido'),
    endTime: z.string().regex(TIME_REGEX, 'Horário inválido'),
    crossesMidnight: z.boolean(),
    headcount: z
      .number({ message: 'Informe um número' })
      .int('Apenas números inteiros')
      .min(1, 'Mínimo 1')
      .max(1000, 'Máximo 1000'),
  })
  .refine(
    (d) => {
      const s = toMinutes(d.startTime)
      const e = toMinutes(d.endTime)
      if (s === e) return false
      if (d.crossesMidnight) return e < s
      return s < e
    },
    {
      message: 'Horário inválido para a configuração atual',
      path: ['endTime'],
    },
  )

export type PatternDefinitionValues = z.infer<typeof defineSchema>

export interface PatternDefinition {
  categoryId: string
  name?: string | null
  daysOfWeek: number[]
  startTimeMinutes: number
  endTimeMinutes: number
  crossesMidnight: boolean
  headcount: number
}

interface Props {
  workspaceId: string
  scheduleId: string
  initial: PatternDefinitionValues | null
  selectedSavedPatternId: string | null
  onSelectSavedPattern: (pattern: ShiftPattern | null) => void
  onChange: (def: PatternDefinition | null) => void
}

function fromPatternToValues(p: ShiftPattern): PatternDefinitionValues {
  return {
    categoryId: p.categoryId,
    name: p.name ?? '',
    daysOfWeek: [...p.daysOfWeek].sort((a, b) => a - b),
    startTime: fromMinutes(p.startTimeMinutes),
    endTime: fromMinutes(p.endTimeMinutes),
    crossesMidnight: p.crossesMidnight,
    headcount: p.headcount,
  }
}

function describePattern(
  p: ShiftPattern,
  categoryName: string | undefined,
): string {
  const cat = categoryName ?? '—'
  return `${p.name ? `${p.name} · ` : ''}${cat} · ${fromMinutes(p.startTimeMinutes)}–${fromMinutes(p.endTimeMinutes)} · ${p.headcount} vaga(s)`
}

export function PatternStepDefine({
  workspaceId,
  scheduleId,
  initial,
  selectedSavedPatternId,
  onSelectSavedPattern,
  onChange,
}: Props) {
  const [savedExpanded, setSavedExpanded] = useState(false)
  const patternsQuery = useShiftPatterns(workspaceId, scheduleId, {
    enabled: savedExpanded,
  })
  const categoriesQuery = useTaxonomies('categories', workspaceId)
  const categories = categoriesQuery.data ?? []

  const {
    register,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<PatternDefinitionValues>({
    resolver: zodResolver(defineSchema),
    mode: 'onChange',
    defaultValues: initial ?? {
      categoryId: '',
      name: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      crossesMidnight: false,
      headcount: 1,
    },
  })

  // Reset when an initial value comes in (e.g. saved-pattern prefill)
  useEffect(() => {
    if (initial) reset(initial)
  }, [initial, reset])

  const readOnly = selectedSavedPatternId !== null

  const startTime = watch('startTime')
  const endTime = watch('endTime')
  const crossesMidnight = watch('crossesMidnight')

  const showCrossMidnightHint = useMemo(() => {
    if (crossesMidnight) return false
    if (!TIME_REGEX.test(startTime ?? '')) return false
    if (!TIME_REGEX.test(endTime ?? '')) return false
    return toMinutes(endTime) < toMinutes(startTime)
  }, [startTime, endTime, crossesMidnight])

  // Push a normalized PatternDefinition (or null) up whenever the form is valid.
  const values = watch()
  useEffect(() => {
    if (!isValid) {
      onChange(null)
      return
    }
    onChange({
      categoryId: values.categoryId,
      name: values.name?.length ? values.name : null,
      daysOfWeek: values.daysOfWeek,
      startTimeMinutes: toMinutes(values.startTime),
      endTimeMinutes: toMinutes(values.endTime),
      crossesMidnight: values.crossesMidnight,
      headcount: values.headcount,
    })
  }, [
    isValid,
    onChange,
    values.categoryId,
    values.name,
    values.daysOfWeek,
    values.startTime,
    values.endTime,
    values.crossesMidnight,
    values.headcount,
  ])

  function handlePickSavedPattern(patternId: string) {
    const p = (patternsQuery.data ?? []).find((row) => row.id === patternId)
    if (!p) return
    onSelectSavedPattern(p)
    reset(fromPatternToValues(p))
  }

  function handleClearSelection() {
    onSelectSavedPattern(null)
    reset({
      categoryId: '',
      name: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      crossesMidnight: false,
      headcount: 1,
    })
  }

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.id, c.name)
    return map
  }, [categories])

  return (
    <div className="flex flex-col gap-4">
      {/* Saved patterns collapsible */}
      <div className="border-border bg-muted/20 rounded-[12px] border p-3">
        <button
          type="button"
          onClick={() => setSavedExpanded((v) => !v)}
          className="text-foreground flex w-full items-center justify-between text-[14px] font-medium"
        >
          Padrões salvos
          {savedExpanded ? (
            <ChevronUp className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </button>
        {savedExpanded && (
          <div className="mt-3 flex flex-col gap-2">
            {patternsQuery.isLoading ? (
              <span className="text-muted-foreground text-[13px]">
                Carregando…
              </span>
            ) : (patternsQuery.data ?? []).length === 0 ? (
              <span className="text-muted-foreground text-[13px]">
                Nenhum padrão salvo nesta escala ainda.
              </span>
            ) : (
              <Select
                value={selectedSavedPatternId ?? ''}
                onValueChange={handlePickSavedPattern}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione um padrão salvo" />
                </SelectTrigger>
                <SelectContent>
                  {(patternsQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {describePattern(p, categoryNameById.get(p.categoryId))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedSavedPatternId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="self-start"
              >
                Limpar seleção
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <Label>Categoria</Label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select
              value={field.value || ''}
              onValueChange={field.onChange}
              disabled={readOnly}
            >
              <SelectTrigger
                className="h-12"
                aria-invalid={errors.categoryId ? true : undefined}
              >
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.categoryId.message}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="pattern-name">Nome (opcional)</Label>
        <Input
          id="pattern-name"
          placeholder="Ex.: Manhã UTI"
          disabled={readOnly}
          {...register('name')}
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.name.message}
          </span>
        )}
      </div>

      {/* Days of week */}
      <div className="flex flex-col gap-2">
        <Label>Dias da semana</Label>
        <Controller
          control={control}
          name="daysOfWeek"
          render={({ field }) => (
            <DaysOfWeekPicker
              value={field.value}
              onChange={field.onChange}
              ariaInvalid={Boolean(errors.daysOfWeek)}
              disabled={readOnly}
            />
          )}
        />
        {errors.daysOfWeek && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.daysOfWeek.message}
          </span>
        )}
      </div>

      {/* Auto-detect banner */}
      {showCrossMidnightHint && !readOnly && (
        <div className="flex items-start gap-3 rounded-[10px] border border-amber-300 bg-amber-50 p-3 text-amber-900">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="flex flex-1 flex-col gap-2">
            <span className="text-[13px] font-medium">
              Parece que esse turno cruza meia-noite.{' '}
              <span className="font-normal">
                Ative essa opção para permitir o horário {startTime}–{endTime}.
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setValue('crossesMidnight', true, { shouldValidate: true })
              }
              className="self-start"
            >
              Ativar
            </Button>
          </div>
        </div>
      )}

      {/* Times */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pattern-start-time">Início</Label>
          <Input
            id="pattern-start-time"
            type="time"
            disabled={readOnly}
            {...register('startTime')}
            aria-invalid={errors.startTime ? true : undefined}
          />
          {errors.startTime && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.startTime.message}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pattern-end-time">Fim</Label>
          <Input
            id="pattern-end-time"
            type="time"
            disabled={readOnly}
            {...register('endTime')}
            aria-invalid={errors.endTime ? true : undefined}
          />
          {errors.endTime && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.endTime.message}
            </span>
          )}
        </div>
      </div>

      {/* Crosses midnight */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <Label htmlFor="pattern-cross-midnight">Cruza meia-noite</Label>
          <span className="text-muted-foreground text-[12px]">
            Ex.: 22:00 → 06:00
          </span>
        </div>
        <Controller
          control={control}
          name="crossesMidnight"
          render={({ field }) => (
            <Switch
              id="pattern-cross-midnight"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={readOnly}
            />
          )}
        />
      </div>

      {/* Headcount */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="pattern-headcount">Vagas</Label>
        <Input
          id="pattern-headcount"
          type="number"
          min={1}
          max={1000}
          step={1}
          disabled={readOnly}
          {...register('headcount', { valueAsNumber: true })}
          aria-invalid={errors.headcount ? true : undefined}
        />
        {errors.headcount && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.headcount.message}
          </span>
        )}
      </div>
    </div>
  )
}
