'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import * as React from 'react'
import type { DateRange } from 'react-day-picker'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { useIsMobile } from '~/hooks/use-is-mobile'
import { cn } from '~/lib/utils'

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function formatPart(date: Date | undefined): string {
  return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : ''
}

function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return ''
  if (!range.to) return formatPart(range.from)
  return `${formatPart(range.from)} – ${formatPart(range.to)}`
}

/**
 * Range calendar trigger. Displays selected range and opens an adaptive
 * Dialog (desktop) / bottom Sheet (mobile) hosting a 2-month range calendar
 * (1 month on mobile). User picks both endpoints then clicks "Aplicar" to
 * commit; "Limpar" wipes the selection.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selecione um período',
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>(value)
  const isMobile = useIsMobile()
  const months = isMobile ? 1 : 2

  React.useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const display = formatRange(value)

  function handleApply() {
    onChange?.(draft)
    setOpen(false)
  }

  function handleClear() {
    setDraft(undefined)
    onChange?.(undefined)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        className={cn(
          'w-full justify-start text-left font-normal',
          !display && 'text-muted-foreground',
          className,
        )}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <CalendarIcon className="mr-2 size-4" />
        {display || <span>{placeholder}</span>}
      </Button>

      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Selecionar período"
        breakpoint="mobile"
        contentClassName="md:max-w-[58rem] lg:max-w-[77rem]"
        footer={
          <div className="flex flex-row justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleClear}
              disabled={!draft?.from && !value?.from}
            >
              Limpar
            </Button>
            <div className="flex flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="solid"
                size="md"
                onClick={handleApply}
                disabled={!draft?.from || !draft?.to}
              >
                Aplicar
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex justify-center">
          <Calendar
            mode="range"
            numberOfMonths={months}
            selected={draft}
            onSelect={(range) => setDraft(range)}
            defaultMonth={draft?.from ?? new Date()}
          />
        </div>
      </AdaptiveDialog>
    </>
  )
}
