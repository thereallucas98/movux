import { Check } from 'lucide-react'

import { cn } from '~/lib/utils'

interface StepIndicatorProps {
  current: 1 | 2 | 3 | 4
}

const LABELS = ['Organização', 'Workspace', 'Profissão', 'Equipe'] as const

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <ol
      className="mb-6 flex items-center justify-between gap-2"
      aria-label={`Passo ${current} de 4`}
    >
      {LABELS.map((label, i) => {
        const idx = (i + 1) as 1 | 2 | 3 | 4
        const state =
          idx < current ? 'done' : idx === current ? 'active' : 'todo'
        const isLast = idx === LABELS.length

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              aria-current={state === 'active' ? 'step' : undefined}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                state === 'active' && 'bg-primary text-primary-foreground',
                state === 'done' && 'bg-primary/15 text-primary',
                state === 'todo' &&
                  'bg-muted text-muted-foreground border-border border',
              )}
            >
              {state === 'done' ? <Check className="size-4" /> : idx}
            </span>
            <span
              className={cn(
                'text-[13px] font-medium whitespace-nowrap',
                state === 'todo' ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {label}
            </span>
            {!isLast && <span className="bg-border ml-1 h-px flex-1" />}
          </li>
        )
      })}
    </ol>
  )
}
