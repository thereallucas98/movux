'use client'

import * as React from 'react'
import { cn } from '~/lib/utils'

// ─── Mask engine ──────────────────────────────────────────────────────────────
// '0' in pattern = any digit slot; any other char is a literal separator.

function applyPattern(digits: string, pattern: string): string {
  let result = ''
  let di = 0
  for (let i = 0; i < pattern.length && di < digits.length; i++) {
    result += pattern[i] === '0' ? digits[di++] : pattern[i]
  }
  return result
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

// ─── Phone smart mask (landline vs mobile) ────────────────────────────────────
// Landline: (XX) XXXX-XXXX   — 10 digits
// Mobile:   (XX) 9XXXX-XXXX  — 11 digits

function applyPhoneMask(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  return applyPattern(d, d.length <= 10 ? '(00) 0000-0000' : '(00) 00000-0000')
}

// ─── Shared input class (mirrors auth form style) ─────────────────────────────

const baseInputCls = cn(
  'text-foreground w-full rounded-[10px] border border-[#d3e2e5] bg-[#f5f8fa] px-4 py-4 text-[16px] font-semibold',
  'placeholder:text-muted-foreground/60 placeholder:font-normal',
  'focus-visible:border-primary focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
  'disabled:opacity-50',
)

// ─── Base masked input ─────────────────────────────────────────────────────────

export interface MaskedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  /** Raw unmasked value (digits only) */
  value?: string
  /** Called with raw digits on every change */
  onChange?: (raw: string) => void
  /** imask-style pattern — '0' = digit slot, literals pass through */
  mask: string
  /** Max raw digit length derived from pattern (auto-calculated if omitted) */
  maxDigits?: number
}

export function MaskedInput({
  value = '',
  onChange,
  mask,
  maxDigits,
  className,
  ...props
}: MaskedInputProps) {
  const limit = maxDigits ?? mask.split('').filter((c) => c === '0').length

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = digitsOnly(e.target.value).slice(0, limit)
    onChange?.(raw)
  }

  return (
    <input
      {...props}
      inputMode="numeric"
      value={applyPattern(digitsOnly(value).slice(0, limit), mask)}
      onChange={handleChange}
      className={cn(baseInputCls, className)}
    />
  )
}

// ─── CEP ──────────────────────────────────────────────────────────────────────
// Pattern: 00000-000  (8 digits)

export interface CepInputProps extends Omit<
  MaskedInputProps,
  'mask' | 'maxDigits'
> {}

export function CepInput({ className, ...props }: CepInputProps) {
  return (
    <MaskedInput
      {...props}
      mask="00000-000"
      placeholder="00000-000"
      className={className}
    />
  )
}

// ─── CPF ──────────────────────────────────────────────────────────────────────
// Pattern: 000.000.000-00  (11 digits)

export interface CpfInputProps extends Omit<
  MaskedInputProps,
  'mask' | 'maxDigits'
> {}

export function CpfInput({ className, ...props }: CpfInputProps) {
  return (
    <MaskedInput
      {...props}
      mask="000.000.000-00"
      placeholder="000.000.000-00"
      className={className}
    />
  )
}

// ─── CNPJ ─────────────────────────────────────────────────────────────────────
// Pattern: 00.000.000/0000-00  (14 digits)

export interface CnpjInputProps extends Omit<
  MaskedInputProps,
  'mask' | 'maxDigits'
> {}

export function CnpjInput({ className, ...props }: CnpjInputProps) {
  return (
    <MaskedInput
      {...props}
      mask="00.000.000/0000-00"
      placeholder="00.000.000/0000-00"
      className={className}
    />
  )
}

// ─── Phone ────────────────────────────────────────────────────────────────────
// Smart: auto-switches between landline (10 digits) and mobile (11 digits)

export interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value?: string
  onChange?: (raw: string) => void
}

export function PhoneInput({
  value = '',
  onChange,
  className,
  ...props
}: PhoneInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = digitsOnly(e.target.value).slice(0, 11)
    onChange?.(raw)
  }

  return (
    <input
      {...props}
      inputMode="numeric"
      value={applyPhoneMask(value)}
      onChange={handleChange}
      placeholder="(00) 00000-0000"
      className={cn(baseInputCls, className)}
    />
  )
}
