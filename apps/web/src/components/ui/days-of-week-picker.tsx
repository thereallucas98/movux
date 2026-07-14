'use client'

import * as React from 'react'

import { Toggle } from '~/components/ui/toggle'
import { cn } from '~/lib/utils'

interface Props {
  value: number[]
  onChange: (next: number[]) => void
  ariaInvalid?: boolean
  disabled?: boolean
  className?: string
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAY_FULL_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const PRESETS: Array<{ label: string; value: number[] }> = [
  { label: 'Dias úteis', value: [1, 2, 3, 4, 5] },
  { label: 'Fim de semana', value: [0, 6] },
  { label: 'Todos', value: [0, 1, 2, 3, 4, 5, 6] },
]

function setsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const n of b) if (!sa.has(n)) return false
  return true
}

/**
 * Days-of-week multi-toggle aligned with the backend `daysOfWeek` integer array
 * (Sun=0…Sat=6). Includes "Dias úteis", "Fim de semana", and "Todos" preset
 * chips above the per-day toggles.
 */
export function DaysOfWeekPicker({
  value,
  onChange,
  ariaInvalid,
  disabled = false,
  className,
}: Props) {
  function toggleDay(day: number) {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day).sort((a, b) => a - b))
    } else {
      onChange([...value, day].sort((a, b) => a - b))
    }
  }

  function applyPreset(next: number[]) {
    onChange([...next])
  }

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      aria-invalid={ariaInvalid ? true : undefined}
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const pressed = setsEqual(value, preset.value)
          return (
            <Toggle
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              pressed={pressed}
              onPressedChange={() => applyPreset(preset.value)}
              disabled={disabled}
            >
              {preset.label}
            </Toggle>
          )
        })}
      </div>
      <div className="flex flex-row gap-2">
        {DAY_LABELS.map((label, i) => {
          const pressed = value.includes(i)
          return (
            <Toggle
              key={label}
              type="button"
              variant="outline"
              size="lg"
              pressed={pressed}
              onPressedChange={() => toggleDay(i)}
              disabled={disabled}
              aria-label={DAY_FULL_LABELS[i]}
              className={cn(
                'h-12 flex-1 lg:w-12 lg:flex-none',
                pressed &&
                  'bg-primary text-primary-foreground hover:bg-primary',
              )}
            >
              {label}
            </Toggle>
          )
        })}
      </div>
    </div>
  )
}
