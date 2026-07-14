import { describe, expect, it } from 'vitest'

import {
  AddShiftTimelineNoteBodySchema,
  ListShiftTimelineQuerySchema,
} from '../shift-timeline.schema'

describe('ListShiftTimelineQuerySchema', () => {
  it('defaults order to asc', () => {
    const r = ListShiftTimelineQuerySchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.order).toBe('asc')
  })

  it('accepts order=desc', () => {
    const r = ListShiftTimelineQuerySchema.safeParse({ order: 'desc' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.order).toBe('desc')
  })

  it('rejects invalid order value', () => {
    expect(
      ListShiftTimelineQuerySchema.safeParse({ order: 'newest' }).success,
    ).toBe(false)
  })

  it('accepts a valid since ISO datetime', () => {
    expect(
      ListShiftTimelineQuerySchema.safeParse({
        since: '2026-09-01T00:00:00.000Z',
      }).success,
    ).toBe(true)
  })

  it('rejects garbage in since', () => {
    expect(
      ListShiftTimelineQuerySchema.safeParse({ since: 'last-tuesday' }).success,
    ).toBe(false)
  })

  it('coerces limit string and rejects > 500', () => {
    const ok = ListShiftTimelineQuerySchema.safeParse({ limit: '50' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.limit).toBe(50)
    expect(ListShiftTimelineQuerySchema.safeParse({ limit: 999 }).success).toBe(
      false,
    )
  })
})

describe('AddShiftTimelineNoteBodySchema', () => {
  it('accepts a valid note', () => {
    const r = AddShiftTimelineNoteBodySchema.safeParse({
      note: 'handoff: paciente estável',
    })
    expect(r.success).toBe(true)
  })

  it('trims and rejects empty after trim', () => {
    expect(
      AddShiftTimelineNoteBodySchema.safeParse({ note: '   ' }).success,
    ).toBe(false)
  })

  it('rejects > 2000 chars', () => {
    expect(
      AddShiftTimelineNoteBodySchema.safeParse({
        note: 'a'.repeat(2001),
      }).success,
    ).toBe(false)
  })
})
