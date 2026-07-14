import { describe, expect, it } from 'vitest'

import {
  ClockInBodySchema,
  CloseAssignmentBodySchema,
  ListTimeEntriesQuerySchema,
} from '../time-entry.schema'

describe('ClockInBodySchema', () => {
  it('accepts empty body', () => {
    expect(ClockInBodySchema.safeParse({}).success).toBe(true)
  })

  it('accepts both lat + lng', () => {
    const r = ClockInBodySchema.safeParse({ lat: -23.5, lng: -46.6 })
    expect(r.success).toBe(true)
  })

  it('rejects lat without lng', () => {
    const r = ClockInBodySchema.safeParse({ lat: -23.5 })
    expect(r.success).toBe(false)
  })

  it('rejects lng without lat', () => {
    const r = ClockInBodySchema.safeParse({ lng: -46.6 })
    expect(r.success).toBe(false)
  })

  it('rejects out-of-range lat', () => {
    const r = ClockInBodySchema.safeParse({ lat: 91, lng: 0 })
    expect(r.success).toBe(false)
  })

  it('rejects out-of-range lng', () => {
    const r = ClockInBodySchema.safeParse({ lat: 0, lng: -181 })
    expect(r.success).toBe(false)
  })
})

describe('CloseAssignmentBodySchema', () => {
  it('accepts empty body', () => {
    expect(CloseAssignmentBodySchema.safeParse({}).success).toBe(true)
  })

  it('accepts notes within length cap', () => {
    expect(
      CloseAssignmentBodySchema.safeParse({ notes: 'turno ok' }).success,
    ).toBe(true)
  })

  it('rejects notes over 2000 chars', () => {
    const r = CloseAssignmentBodySchema.safeParse({ notes: 'a'.repeat(2001) })
    expect(r.success).toBe(false)
  })
})

describe('ListTimeEntriesQuerySchema', () => {
  it('defaults format to json', () => {
    const r = ListTimeEntriesQuerySchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.format).toBe('json')
  })

  it('accepts valid date range', () => {
    const r = ListTimeEntriesQuerySchema.safeParse({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.000Z',
    })
    expect(r.success).toBe(true)
  })

  it('rejects from > to', () => {
    const r = ListTimeEntriesQuerySchema.safeParse({
      from: '2026-12-01T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
    })
    expect(r.success).toBe(false)
  })

  it('rejects invalid format value', () => {
    const r = ListTimeEntriesQuerySchema.safeParse({ format: 'xml' })
    expect(r.success).toBe(false)
  })

  it('coerces limit string to number', () => {
    const r = ListTimeEntriesQuerySchema.safeParse({ limit: '25' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.limit).toBe(25)
  })
})
