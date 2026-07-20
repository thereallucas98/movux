'use client'

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import * as React from 'react'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

const WEEKDAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

interface AdaptiveDatePickerProps {
  value?: Date | null
  onChange?: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

function buildWeeks(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

/**
 * Custom month grid — not a react-day-picker wrapper. Built to match the
 * reference design: wide layout, generous row height, weekday header row,
 * selected day as a solid filled circle.
 */
function MonthGrid({
  month,
  selected,
  onSelectDay,
}: {
  month: Date
  selected: Date | undefined
  onSelectDay: (day: Date) => void
}) {
  const weeks = buildWeeks(month)

  return (
    <div className="w-full">
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-muted-foreground pb-3 text-center text-sm font-medium"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = isSameMonth(day, month)
              const isSelected = selected && isSameDay(day, selected)
              return (
                <div
                  key={day.toISOString()}
                  className="flex justify-center py-1"
                >
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    disabled={!inMonth}
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full text-base transition-colors sm:h-14 sm:w-14 sm:text-lg',
                      !inMonth &&
                        'text-muted-foreground/30 pointer-events-none',
                      inMonth &&
                        !isSelected &&
                        'text-foreground hover:bg-muted',
                      isSelected &&
                        'bg-primary text-primary-foreground font-semibold',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Date picker using the app's own AdaptiveDialog (Dialog desktop / bottom
 * Sheet mobile), with a purpose-built month grid (not react-day-picker) so
 * spacing/typography can match the reference design exactly.
 */
export function AdaptiveDatePicker({
  value,
  onChange,
  label = 'Selecione uma data',
  placeholder = 'Selecione uma data',
  disabled = false,
  className,
}: AdaptiveDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState<Date | undefined>(
    value ?? undefined,
  )
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(
    value ?? new Date(),
  )

  React.useEffect(() => {
    if (open) {
      setPending(value ?? undefined)
      setVisibleMonth(value ?? new Date())
    }
  }, [open, value])

  function handleConfirm() {
    onChange?.(pending)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          'w-full justify-start text-left font-normal',
          !value && 'text-muted-foreground',
          className,
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? (
          format(value, 'dd/MM/yyyy', { locale: ptBR })
        ) : (
          <span>{placeholder}</span>
        )}
      </Button>

      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        contentClassName="w-[90vw] max-w-2xl"
        footer={
          <div className="flex flex-row-reverse gap-2">
            <Button
              type="button"
              variant="solid"
              onClick={handleConfirm}
              disabled={!pending}
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 px-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
              className="hover:bg-muted flex h-10 w-10 items-center justify-center rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold capitalize">
              {format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
              className="hover:bg-muted flex h-10 w-10 items-center justify-center rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <MonthGrid
            month={visibleMonth}
            selected={pending}
            onSelectDay={setPending}
          />
        </div>
      </AdaptiveDialog>
    </>
  )
}
