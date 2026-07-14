import { describe, expect, it } from 'vitest'

import { formatPercent, formatShiftStartLabel, nextWeekRange } from '../date'

describe('nextWeekRange', () => {
  it('spans 8 calendar days (today inclusive through today+7 end-of-day)', () => {
    const now = new Date('2026-04-28T12:00:00Z')
    const { fromAt, toAt } = nextWeekRange('America/Sao_Paulo', now)
    const diffDays = (toAt.getTime() - fromAt.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(7.9)
    expect(diffDays).toBeLessThan(8.01)
  })

  it('starts at midnight in the requested timezone', () => {
    const now = new Date('2026-04-28T12:00:00Z')
    const { fromAt } = nextWeekRange('America/Sao_Paulo', now)
    // 00:00 in São Paulo (-03) is 03:00 UTC
    expect(fromAt.toISOString()).toContain('03:00:00')
  })
})

describe('formatPercent', () => {
  it('rounds to integer', () => {
    expect(formatPercent(2, 3)).toBe('67%')
    expect(formatPercent(1, 4)).toBe('25%')
  })

  it('returns em-dash when total is zero', () => {
    expect(formatPercent(0, 0)).toBe('—')
    expect(formatPercent(5, 0)).toBe('—')
  })

  it('returns 100% when fully filled', () => {
    expect(formatPercent(8, 8)).toBe('100%')
  })
})

describe('formatShiftStartLabel', () => {
  it('formats a UTC date in São Paulo timezone with PT-BR month abbreviation', () => {
    const date = new Date('2026-04-28T10:00:00Z')
    const label = formatShiftStartLabel(date, 'America/Sao_Paulo')
    // -03 → 07:00 local
    expect(label).toMatch(/^28 abr · 07:00$/)
  })

  it('respects different timezones', () => {
    const date = new Date('2026-04-28T10:00:00Z')
    const utcLabel = formatShiftStartLabel(date, 'UTC')
    expect(utcLabel).toMatch(/^28 abr · 10:00$/)
  })
})
