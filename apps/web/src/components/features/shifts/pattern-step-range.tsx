'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { DateRangePicker } from '~/components/ui/date-range-picker'
import { Label } from '~/components/ui/label'

interface Props {
  defaultRange: { start: Date; end: Date }
  onChange: (range: { rangeStart: Date; rangeEnd: Date } | null) => void
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

function clampRangeToNinetyDays(start: Date, end: Date): Date {
  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= NINETY_DAYS_MS) return end
  return new Date(start.getTime() + NINETY_DAYS_MS)
}

export function PatternStepRange({ defaultRange, onChange }: Props) {
  const initialRange: DateRange = useMemo(
    () => ({
      from: defaultRange.start,
      to: clampRangeToNinetyDays(defaultRange.start, defaultRange.end),
    }),
    [defaultRange.start, defaultRange.end],
  )

  const [range, setRange] = useState<DateRange | undefined>(initialRange)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!range?.from || !range.to) {
      setError(null)
      onChange(null)
      return
    }
    if (range.from >= range.to) {
      setError('Início deve ser antes do fim')
      onChange(null)
      return
    }
    if (range.to.getTime() - range.from.getTime() > NINETY_DAYS_MS) {
      setError('Intervalo máximo de 90 dias')
      onChange(null)
      return
    }
    setError(null)
    onChange({ rangeStart: range.from, rangeEnd: range.to })
  }, [range, onChange])

  return (
    <div className="flex flex-col gap-2">
      <Label>Período de geração</Label>
      <DateRangePicker
        value={range}
        onChange={(next) => setRange(next)}
        placeholder="Selecione o período"
      />
      <span className="text-muted-foreground text-[12px]">
        Os turnos serão gerados nos dias selecionados que correspondam ao
        padrão. Limite máximo de 90 dias.
      </span>
      {error && (
        <span className="text-destructive text-[13px] font-medium">
          {error}
        </span>
      )}
    </div>
  )
}
