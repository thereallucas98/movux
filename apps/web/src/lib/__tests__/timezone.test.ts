import { formatInTimeZone } from 'date-fns-tz'
import { describe, expect, it } from 'vitest'

describe('date-fns-tz sanity', () => {
  it('converts UTC noon to America/Sao_Paulo time', () => {
    const utc = new Date('2026-06-15T12:00:00Z')
    const result = formatInTimeZone(utc, 'America/Sao_Paulo', 'HH:mm')
    expect(result).toBe('09:00')
  })

  it('rolls back the date when UTC midnight falls on the previous day in São Paulo', () => {
    const utc = new Date('2026-06-15T00:00:00Z')
    const result = formatInTimeZone(utc, 'America/Sao_Paulo', 'yyyy-MM-dd')
    expect(result).toBe('2026-06-14')
  })
})
