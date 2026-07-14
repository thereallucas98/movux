import { describe, expect, it } from 'vitest'

import { formatDateShort, formatPeriodRange } from '../date-range'

const TZ = 'America/Sao_Paulo'
const currentYear = new Date().getUTCFullYear()

describe('formatPeriodRange', () => {
  it('same year + same month → day–day mes', () => {
    const from = new Date(`${currentYear}-05-01T03:00:00Z`)
    const to = new Date(`${currentYear}-05-15T03:00:00Z`)
    expect(formatPeriodRange(from, to, TZ)).toBe('01 – 15 mai')
  })

  it('same year + different months → da mes – db mes', () => {
    const from = new Date(`${currentYear}-05-01T03:00:00Z`)
    const to = new Date(`${currentYear}-06-30T03:00:00Z`)
    expect(formatPeriodRange(from, to, TZ)).toBe('01 mai – 30 jun')
  })

  it('different years → both with year', () => {
    const from = new Date('2025-12-30T03:00:00Z')
    const to = new Date('2026-01-05T03:00:00Z')
    expect(formatPeriodRange(from, to, TZ)).toBe('30 dez 2025 – 05 jan 2026')
  })

  it('single day same year same month', () => {
    const date = new Date(`${currentYear}-07-04T03:00:00Z`)
    expect(formatPeriodRange(date, date, TZ)).toBe('04 – 04 jul')
  })
})

describe('formatDateShort', () => {
  it('omits year when current', () => {
    const date = new Date(`${currentYear}-04-29T03:00:00Z`)
    expect(formatDateShort(date, TZ)).toBe('29 abr')
  })

  it('forces year via opts', () => {
    const date = new Date(`${currentYear}-04-29T03:00:00Z`)
    expect(formatDateShort(date, TZ, { withYear: true })).toBe(
      `29 abr ${currentYear}`,
    )
  })
})
