'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import * as React from 'react'
import type { DateRange } from 'react-day-picker'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useIsMobile } from '~/hooks/use-is-mobile'
import { cn } from '~/lib/utils'

export interface DateTimeRange {
  start?: Date
  end?: Date
}

interface DateTimeRangePickerProps {
  value?: DateTimeRange
  onChange?: (value: DateTimeRange) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  ariaInvalid?: boolean
}

function toTimeString(date: Date | undefined): string {
  if (!date) return ''
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function combine(date: Date, hhmm: string): Date {
  const [hh, mm] = hhmm.split(':').map(Number)
  const next = new Date(date)
  next.setHours(hh ?? 0, mm ?? 0, 0, 0)
  return next
}

function formatLabel(date: Date | undefined): string {
  if (!date) return ''
  return format(date, "dd MMM '·' HH:mm", { locale: ptBR })
}

function formatRange(value: DateTimeRange | undefined): string {
  if (!value?.start) return ''
  if (!value.end) return formatLabel(value.start)
  return `${formatLabel(value.start)} – ${formatLabel(value.end)}`
}

/**
 * Range calendar + start/end time inputs hosted in an AdaptiveDialog.
 * On mobile, renders as a bottom sheet with a single-month calendar; on
 * desktop, a wide dialog with a 2-month range. For shifts that cross
 * midnight, the user picks two distinct calendar dates.
 */
export function DateTimeRangePicker({
  value,
  onChange,
  placeholder = 'Selecione início e fim',
  disabled = false,
  className,
  ariaInvalid,
}: DateTimeRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(
    value?.start
      ? { from: value.start, to: value.end ?? value.start }
      : undefined,
  )
  const [startTime, setStartTime] = React.useState<string>(
    toTimeString(value?.start),
  )
  const [endTime, setEndTime] = React.useState<string>(toTimeString(value?.end))
  const isMobile = useIsMobile()
  const months = isMobile ? 1 : 2

  React.useEffect(() => {
    if (open) {
      setDraftRange(
        value?.start
          ? { from: value.start, to: value.end ?? value.start }
          : undefined,
      )
      setStartTime(toTimeString(value?.start))
      setEndTime(toTimeString(value?.end))
    }
  }, [open, value])

  const display = formatRange(value)

  const canApply =
    Boolean(draftRange?.from) &&
    Boolean(draftRange?.to) &&
    startTime.length === 5 &&
    endTime.length === 5

  function handleApply() {
    if (!draftRange?.from || !draftRange?.to) return
    const start = combine(draftRange.from, startTime)
    const end = combine(draftRange.to, endTime)
    onChange?.({ start, end })
    setOpen(false)
  }

  function handleClear() {
    setDraftRange(undefined)
    setStartTime('')
    setEndTime('')
    onChange?.({ start: undefined, end: undefined })
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        aria-invalid={ariaInvalid ? true : undefined}
        className={cn(
          'h-12 w-full justify-start text-left font-normal',
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
        title="Selecionar início e fim"
        breakpoint="mobile"
        contentClassName="md:max-w-[58rem] lg:max-w-[77rem]"
        footer={
          <div className="flex flex-row justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleClear}
              disabled={!draftRange?.from && !value?.start}
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
                disabled={!canApply}
              >
                Aplicar
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <Calendar
              mode="range"
              numberOfMonths={months}
              selected={draftRange}
              onSelect={(range) => setDraftRange(range)}
              defaultMonth={draftRange?.from ?? new Date()}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="datetime-range-start">Início</Label>
              <Input
                id="datetime-range-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="datetime-range-end">Fim</Label>
              <Input
                id="datetime-range-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Para turnos que cruzam meia-noite, selecione 2 dias diferentes no
            calendário.
          </p>
        </div>
      </AdaptiveDialog>
    </>
  )
}
