import { describe, expect, it } from 'vitest'

import { computeOvertimeMinutes, isWithinTolerance } from '../clock-tolerance'

const ANCHOR = new Date('2026-09-01T08:00:00.000Z')

describe('isWithinTolerance', () => {
  it('returns true at exact anchor', () => {
    expect(
      isWithinTolerance({
        actualAt: ANCHOR,
        anchorAt: ANCHOR,
        toleranceMinutes: 15,
      }),
    ).toBe(true)
  })

  it('returns true 1 ms before the upper edge', () => {
    expect(
      isWithinTolerance({
        actualAt: new Date(ANCHOR.getTime() + 15 * 60_000 - 1),
        anchorAt: ANCHOR,
        toleranceMinutes: 15,
      }),
    ).toBe(true)
  })

  it('returns true exactly at the upper edge (inclusive)', () => {
    expect(
      isWithinTolerance({
        actualAt: new Date(ANCHOR.getTime() + 15 * 60_000),
        anchorAt: ANCHOR,
        toleranceMinutes: 15,
      }),
    ).toBe(true)
  })

  it('returns false 1 ms past the upper edge', () => {
    expect(
      isWithinTolerance({
        actualAt: new Date(ANCHOR.getTime() + 15 * 60_000 + 1),
        anchorAt: ANCHOR,
        toleranceMinutes: 15,
      }),
    ).toBe(false)
  })

  it('is symmetric — early clock-in within window returns true', () => {
    expect(
      isWithinTolerance({
        actualAt: new Date(ANCHOR.getTime() - 10 * 60_000),
        anchorAt: ANCHOR,
        toleranceMinutes: 15,
      }),
    ).toBe(true)
  })

  it('returns false for clock far before the anchor', () => {
    expect(
      isWithinTolerance({
        actualAt: new Date(ANCHOR.getTime() - 60 * 60_000),
        anchorAt: ANCHOR,
        toleranceMinutes: 15,
      }),
    ).toBe(false)
  })

  it('treats zero tolerance as exact-match only', () => {
    expect(
      isWithinTolerance({
        actualAt: ANCHOR,
        anchorAt: ANCHOR,
        toleranceMinutes: 0,
      }),
    ).toBe(true)
    expect(
      isWithinTolerance({
        actualAt: new Date(ANCHOR.getTime() + 1),
        anchorAt: ANCHOR,
        toleranceMinutes: 0,
      }),
    ).toBe(false)
  })
})

describe('computeOvertimeMinutes', () => {
  const END = new Date('2026-09-01T17:00:00.000Z')

  it('returns 0 when clock-out is before the shift end', () => {
    expect(
      computeOvertimeMinutes({
        clockOutAt: new Date(END.getTime() - 60_000),
        shiftEndAt: END,
      }),
    ).toBe(0)
  })

  it('returns 0 when clock-out is exactly at the shift end', () => {
    expect(computeOvertimeMinutes({ clockOutAt: END, shiftEndAt: END })).toBe(0)
  })

  it('returns 1 when clock-out is 30s past the end (ceil)', () => {
    expect(
      computeOvertimeMinutes({
        clockOutAt: new Date(END.getTime() + 30_000),
        shiftEndAt: END,
      }),
    ).toBe(1)
  })

  it('returns 1 when clock-out is exactly 60s past the end', () => {
    expect(
      computeOvertimeMinutes({
        clockOutAt: new Date(END.getTime() + 60_000),
        shiftEndAt: END,
      }),
    ).toBe(1)
  })

  it('returns 2 when clock-out is 61s past the end', () => {
    expect(
      computeOvertimeMinutes({
        clockOutAt: new Date(END.getTime() + 61_000),
        shiftEndAt: END,
      }),
    ).toBe(2)
  })

  it('returns 5 when clock-out is exactly 5 min past', () => {
    expect(
      computeOvertimeMinutes({
        clockOutAt: new Date(END.getTime() + 5 * 60_000),
        shiftEndAt: END,
      }),
    ).toBe(5)
  })
})
