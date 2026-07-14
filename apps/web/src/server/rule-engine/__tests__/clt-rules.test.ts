import { describe, expect, it } from 'vitest'

import { createRuleEngine } from '../engine'
import {
  cltRules,
  maxWeeklyHoursRule,
  minInterShiftRestRule,
  type CLTContext,
} from '../clt-rules'

const baseCtx: CLTContext = {
  userId: 'u-1',
  workspaceId: 'ws-1',
  clockOutAt: new Date('2026-09-15T22:00:00.000Z'),
  shiftEndAt: new Date('2026-09-15T22:00:00.000Z'),
  lastClockOutAt: null,
  hoursThisWeek: 30,
}

const HOUR_MS = 60 * 60 * 1000

describe('minInterShiftRestRule', () => {
  it('returns null when no prior clock-out exists', () => {
    expect(
      minInterShiftRestRule.evaluate({ ...baseCtx, lastClockOutAt: null }),
    ).toBeNull()
  })

  it('returns null when rest is exactly 11h (boundary inclusive)', () => {
    expect(
      minInterShiftRestRule.evaluate({
        ...baseCtx,
        lastClockOutAt: new Date(baseCtx.clockOutAt.getTime() - 11 * HOUR_MS),
      }),
    ).toBeNull()
  })

  it('returns null when rest is greater than 11h', () => {
    expect(
      minInterShiftRestRule.evaluate({
        ...baseCtx,
        lastClockOutAt: new Date(baseCtx.clockOutAt.getTime() - 24 * HOUR_MS),
      }),
    ).toBeNull()
  })

  it('fires when rest is 1ms below 11h', () => {
    const v = minInterShiftRestRule.evaluate({
      ...baseCtx,
      lastClockOutAt: new Date(baseCtx.clockOutAt.getTime() - 11 * HOUR_MS + 1),
    })
    expect(v?.ruleId).toBe('CLT_MIN_INTER_SHIFT_REST')
    expect(v?.severity).toBe('warning')
  })

  it('fires when rest is 8h (well below threshold)', () => {
    const v = minInterShiftRestRule.evaluate({
      ...baseCtx,
      lastClockOutAt: new Date(baseCtx.clockOutAt.getTime() - 8 * HOUR_MS),
    })
    expect(v?.ruleId).toBe('CLT_MIN_INTER_SHIFT_REST')
    expect(v?.metadata?.restMs).toBe(8 * HOUR_MS)
  })
})

describe('maxWeeklyHoursRule', () => {
  it('returns null when hours equal 44 (boundary inclusive)', () => {
    expect(
      maxWeeklyHoursRule.evaluate({ ...baseCtx, hoursThisWeek: 44 }),
    ).toBeNull()
  })

  it('returns null when hours below cap', () => {
    expect(
      maxWeeklyHoursRule.evaluate({ ...baseCtx, hoursThisWeek: 30 }),
    ).toBeNull()
  })

  it('fires when hours are 44.01 (just over cap)', () => {
    const v = maxWeeklyHoursRule.evaluate({
      ...baseCtx,
      hoursThisWeek: 44.01,
    })
    expect(v?.ruleId).toBe('CLT_MAX_WEEKLY_HOURS')
    expect(v?.severity).toBe('warning')
    expect(v?.metadata?.hoursThisWeek).toBe(44.01)
  })

  it('fires when hours are 60', () => {
    const v = maxWeeklyHoursRule.evaluate({ ...baseCtx, hoursThisWeek: 60 })
    expect(v?.ruleId).toBe('CLT_MAX_WEEKLY_HOURS')
  })
})

describe('cltRules engine integration', () => {
  it('aggregates both rules in one evaluate() call', () => {
    const engine = createRuleEngine<CLTContext>(cltRules)
    const violations = engine.evaluate({
      ...baseCtx,
      lastClockOutAt: new Date(baseCtx.clockOutAt.getTime() - 8 * HOUR_MS),
      hoursThisWeek: 50,
    })
    expect(violations).toHaveLength(2)
    expect(violations.map((v) => v.ruleId).sort()).toEqual([
      'CLT_MAX_WEEKLY_HOURS',
      'CLT_MIN_INTER_SHIFT_REST',
    ])
  })

  it('returns empty when neither rule fires', () => {
    const engine = createRuleEngine<CLTContext>(cltRules)
    const violations = engine.evaluate({
      ...baseCtx,
      lastClockOutAt: new Date(baseCtx.clockOutAt.getTime() - 24 * HOUR_MS),
      hoursThisWeek: 30,
    })
    expect(violations).toEqual([])
  })
})
