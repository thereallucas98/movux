'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useMediaQuery } from '~/hooks/use-media-query'
import { cn } from '~/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdaptiveSelectProps<TOption, TValue extends string> {
  options: TOption[]
  getOptionValue: (option: TOption) => TValue
  getOptionLabel: (option: TOption) => string
  value: TValue | undefined
  onValueChange: (value: TValue) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  triggerClassName?: string
  sheetContentClassName?: string
}

// ─── Base trigger classes (mirrors SelectTrigger defaults) ────────────────────

const baseTriggerCls =
  'flex h-12 w-full items-center justify-between rounded-input border border-input bg-background px-3 py-2 text-sm whitespace-nowrap shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// ─── Component ────────────────────────────────────────────────────────────────

export function AdaptiveSelect<TOption, TValue extends string>({
  options,
  getOptionValue,
  getOptionLabel,
  value,
  onValueChange,
  placeholder = 'Selecione',
  label,
  disabled,
  triggerClassName,
  sheetContentClassName,
}: AdaptiveSelectProps<TOption, TValue>) {
  const isMobile = useMediaQuery('(max-width: 1023px)')

  const selectedLabel = value
    ? options.find((o) => getOptionValue(o) === value)
      ? getOptionLabel(options.find((o) => getOptionValue(o) === value)!)
      : undefined
    : undefined

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <button
            data-slot="adaptive-select"
            disabled={disabled}
            className={cn(baseTriggerCls, triggerClassName)}
          >
            <span className="line-clamp-1">
              {selectedLabel ?? (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className={cn(
            'bg-background max-h-[70dvh] rounded-t-[20px] border-none p-0',
            sheetContentClassName,
          )}
        >
          <SheetHeader className="px-6 pt-6 pb-2">
            {label && (
              <SheetTitle className="text-foreground text-left text-[18px] font-extrabold">
                {label}
              </SheetTitle>
            )}
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-8">
            {options.map((option) => {
              const optValue = getOptionValue(option)
              const optLabel = getOptionLabel(option)
              const isSelected = optValue === value
              return (
                <SheetClose asChild key={optValue}>
                  <button
                    onClick={() => onValueChange(optValue)}
                    className={cn(
                      'text-foreground flex w-full cursor-pointer items-center justify-between rounded-[12px] px-4 py-3 text-left text-[15px] font-semibold transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary font-extrabold'
                        : 'hover:bg-muted',
                    )}
                  >
                    <span>{optLabel}</span>
                    {isSelected && (
                      <Check
                        className="text-primary size-4 shrink-0"
                        aria-hidden
                      />
                    )}
                  </button>
                </SheetClose>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // ── Desktop: standard Radix Select dropdown ───────────────────────────────
  return (
    <Select
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger data-slot="adaptive-select" className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const optValue = getOptionValue(option)
          return (
            <SelectItem key={optValue} value={optValue}>
              {getOptionLabel(option)}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
