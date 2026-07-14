'use client'

import * as React from 'react'

import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { cn } from '~/lib/utils'

interface CountryDef {
  code: string
  dial: string
  label: string
  mask: string
  maxDigits: number
}

const COUNTRIES: readonly CountryDef[] = [
  {
    code: 'BR',
    dial: '55',
    label: 'Brasil',
    mask: '(00) 0 0000-0000',
    maxDigits: 11,
  },
  {
    code: 'AR',
    dial: '54',
    label: 'Argentina',
    mask: '00 00 0000-0000',
    maxDigits: 10,
  },
  { code: 'CL', dial: '56', label: 'Chile', mask: '0 0000 0000', maxDigits: 9 },
  {
    code: 'CO',
    dial: '57',
    label: 'Colômbia',
    mask: '000 000 0000',
    maxDigits: 10,
  },
  {
    code: 'MX',
    dial: '52',
    label: 'México',
    mask: '00 0000 0000',
    maxDigits: 10,
  },
  { code: 'PE', dial: '51', label: 'Peru', mask: '000 000 000', maxDigits: 9 },
  {
    code: 'UY',
    dial: '598',
    label: 'Uruguai',
    mask: '0 000 0000',
    maxDigits: 8,
  },
] as const

const DEFAULT_COUNTRY = COUNTRIES[0]

interface Props {
  value: string
  onChange: (next: string) => void
  defaultCountry?: string
  disabled?: boolean
  ariaInvalid?: boolean
  className?: string
  placeholder?: string
  id?: string
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function applyPattern(digits: string, pattern: string): string {
  let result = ''
  let di = 0
  for (let i = 0; i < pattern.length && di < digits.length; i++) {
    result += pattern[i] === '0' ? digits[di++] : pattern[i]
  }
  return result
}

function findCountryFromValue(value: string): CountryDef | null {
  if (!value || !value.startsWith('+')) return null
  const raw = value.slice(1)
  // Sort by dial length desc to match longer prefixes (e.g., 598 before 5).
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (raw.startsWith(c.dial)) return c
  }
  return null
}

function findCountryByCode(code: string): CountryDef | null {
  return COUNTRIES.find((c) => c.code === code) ?? null
}

/**
 * E.164 phone input with country picker. Stores full E.164 (+<dial><digits>);
 * UI shows a country select + a masked digit input. BR is the default. When
 * the value's dial code is unknown, falls back to a free-form input.
 */
export function E164PhoneInput({
  value,
  onChange,
  defaultCountry = 'BR',
  disabled,
  ariaInvalid,
  className,
  placeholder,
  id,
}: Props) {
  const initialFromValue = findCountryFromValue(value)
  const [country, setCountry] = React.useState<CountryDef>(
    initialFromValue ?? findCountryByCode(defaultCountry) ?? DEFAULT_COUNTRY,
  )
  const initialDigits =
    initialFromValue && value.startsWith(`+${initialFromValue.dial}`)
      ? digitsOnly(value.slice(1 + initialFromValue.dial.length))
      : ''
  const [digits, setDigits] = React.useState<string>(initialDigits)

  // Re-sync from external value when it changes (e.g., reset()).
  React.useEffect(() => {
    const fromValue = findCountryFromValue(value)
    if (fromValue) {
      setCountry(fromValue)
      setDigits(digitsOnly(value.slice(1 + fromValue.dial.length)))
    } else if (value === '') {
      setDigits('')
    }
  }, [value])

  function emit(nextDial: string, nextDigits: string) {
    if (nextDigits.length === 0) {
      onChange('')
    } else {
      onChange(`+${nextDial}${nextDigits}`)
    }
  }

  function handleCountryChange(code: string) {
    const next = findCountryByCode(code) ?? DEFAULT_COUNTRY
    setCountry(next)
    setDigits('')
    onChange('')
  }

  function handleDigitsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = digitsOnly(e.target.value).slice(0, country.maxDigits)
    setDigits(next)
    emit(country.dial, next)
  }

  const masked = applyPattern(digits, country.mask)

  return (
    <div className={cn('flex w-full flex-row gap-2', className)}>
      <Select
        value={country.code}
        onValueChange={handleCountryChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-12 w-[8.5rem] shrink-0" aria-label="País">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              +{c.dial} {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={masked}
        onChange={handleDigitsChange}
        disabled={disabled}
        aria-invalid={ariaInvalid ? true : undefined}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  )
}
