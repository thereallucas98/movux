import { describe, expect, it } from 'vitest'

import {
  computeTransferDeadline,
  isWithinDecisionWindow,
} from '../decision-window'

describe('isWithinDecisionWindow', () => {
  it('true when now is before deadline', () => {
    const deadline = new Date('2026-08-01T12:00:00Z')
    const now = new Date('2026-08-01T11:00:00Z')
    expect(isWithinDecisionWindow(deadline, now)).toBe(true)
  })

  it('true when now equals deadline (boundary inclusive)', () => {
    const t = new Date('2026-08-01T12:00:00Z')
    expect(isWithinDecisionWindow(t, t)).toBe(true)
  })

  it('false when now is after deadline', () => {
    const deadline = new Date('2026-08-01T12:00:00Z')
    const now = new Date('2026-08-01T13:00:00Z')
    expect(isWithinDecisionWindow(deadline, now)).toBe(false)
  })
})

describe('computeTransferDeadline', () => {
  it('fresh window wins when shift is far in the future', () => {
    const now = new Date('2026-08-01T00:00:00Z')
    const result = computeTransferDeadline({
      now,
      shiftStartAt: new Date('2026-09-01T00:00:00Z'), // 31 days away
      decisionWindowHours: 48,
    })
    // fresh = now + 48h = 2026-08-03T00:00:00Z
    expect(result.toISOString()).toBe('2026-08-03T00:00:00.000Z')
  })

  it('caps at shift.startAt - 1h when fresh window would exceed', () => {
    const now = new Date('2026-08-01T00:00:00Z')
    const result = computeTransferDeadline({
      now,
      shiftStartAt: new Date('2026-08-02T00:00:00Z'), // 24h away
      decisionWindowHours: 48, // would land 24h after shift
    })
    // cutoff = startAt - 1h = 2026-08-01T23:00:00Z
    expect(result.toISOString()).toBe('2026-08-01T23:00:00.000Z')
  })

  it('floors at now+15min when shift is < 1h away', () => {
    const now = new Date('2026-08-01T11:30:00Z')
    const result = computeTransferDeadline({
      now,
      shiftStartAt: new Date('2026-08-01T12:00:00Z'), // 30min away
      decisionWindowHours: 48,
    })
    // cutoff = 11:00Z (in past relative to now); floor = now+15min = 11:45Z
    expect(result.toISOString()).toBe('2026-08-01T11:45:00.000Z')
  })
})
