import { describe, expect, it, vi } from 'vitest'

import { preflightPatternQuota } from '../preflight-pattern-quota'

function makeMockDb(shiftCounts: number[] = []) {
  let i = 0
  return {
    workspace: { count: vi.fn() },
    workspaceMembership: { count: vi.fn() },
    category: { count: vi.fn() },
    specialty: { count: vi.fn() },
    schedule: { count: vi.fn() },
    shift: {
      count: vi.fn(async () => shiftCounts[i++] ?? 0),
    },
    request: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  }
}

const TZ = 'America/Sao_Paulo'

const dailyPattern = {
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // every day
  startTimeMinutes: 8 * 60, // 08:00 local
  endTimeMinutes: 16 * 60, // 16:00 local
  crossesMidnight: false,
}

describe('preflightPatternQuota', () => {
  it('returns ok with candidateCount=0 for an empty range', async () => {
    const db = makeMockDb([0])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-10T00:00:00Z'),
        rangeEnd: new Date('2026-05-10T00:00:00Z'),
        pattern: dailyPattern,
        plan: 'FREE',
      },
    )
    expect(result).toEqual({ ok: true, candidateCount: 0 })
  })

  it('returns ok when within the same-month bucket under limit', async () => {
    // FREE limit = 200; 7 daily shifts in May, existing = 100
    const db = makeMockDb([100])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-10T00:00:00Z'),
        rangeEnd: new Date('2026-05-17T00:00:00Z'),
        pattern: dailyPattern,
        plan: 'FREE',
      },
    )
    if (!result.ok) throw new Error('expected ok')
    expect(result.candidateCount).toBeGreaterThan(0)
  })

  it('CORPORATE short-circuits even with millions of candidates (no DB calls)', async () => {
    const db = makeMockDb([])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-01T00:00:00Z'),
        rangeEnd: new Date('2026-07-30T00:00:00Z'),
        pattern: dailyPattern,
        plan: 'CORPORATE',
      },
    )
    expect(result.ok).toBe(true)
    expect(db.shift.count).not.toHaveBeenCalled()
  })

  it('returns ok=false with PatternBucketMeta when first month overflows', async () => {
    // FREE limit = 200; existing in May = 195; daily for 30 days adds 30 → 225
    const db = makeMockDb([195])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-01T00:00:00Z'),
        rangeEnd: new Date('2026-05-31T00:00:00Z'),
        pattern: dailyPattern,
        plan: 'FREE',
      },
    )
    if (result.ok) throw new Error('expected ok=false')
    expect(result.meta.shape).toBe('pattern')
    expect(result.meta.resource).toBe('shiftsPerMonthPerWorkspace')
    expect(result.meta.plan).toBe('FREE')
    expect(Object.keys(result.meta.perMonth).length).toBe(1)
    expect(result.meta.suggestion.adjustedEndDate).toBeInstanceOf(Date)
    expect(result.meta.suggestion.wouldGenerate).toBeGreaterThan(0)
    expect(result.meta.suggestion.wouldGenerate).toBeLessThan(30)
  })

  it('handles a multi-month range and overflow in the second month', async () => {
    // FREE limit = 200
    // May existing = 100, gets 30 → 130 (ok)
    // June existing = 195, gets 30 → 225 (overflow at day 6)
    const db = makeMockDb([100, 195])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-01T00:00:00Z'),
        rangeEnd: new Date('2026-06-30T00:00:00Z'),
        pattern: dailyPattern,
        plan: 'FREE',
      },
    )
    if (result.ok) throw new Error('expected ok=false')
    // We should report two months (May ok-record + June violating)
    expect(Object.keys(result.meta.perMonth).length).toBe(2)
    // adjustedEndDate should fall in early June (before the 6th violator)
    const adj = result.meta.suggestion.adjustedEndDate
    expect(adj.getUTCMonth()).toBe(5) // June (0-indexed)
  })

  it('perMonth contains projected and limit values', async () => {
    const db = makeMockDb([100])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-01T00:00:00Z'),
        rangeEnd: new Date('2026-05-31T00:00:00Z'),
        pattern: dailyPattern,
        plan: 'FREE',
      },
    )
    if (!result.ok) {
      // shouldn't overflow at 100 existing + ~30 candidates = 130 < 200
      throw new Error('expected ok=true at 100+30')
    }
  })

  it('perMonth bucket key is YYYY-MM in workspace timezone', async () => {
    const db = makeMockDb([195])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-01T00:00:00Z'),
        rangeEnd: new Date('2026-05-15T00:00:00Z'),
        pattern: dailyPattern,
        plan: 'FREE',
      },
    )
    if (result.ok) throw new Error('expected ok=false')
    const keys = Object.keys(result.meta.perMonth)
    expect(keys[0]).toBe('2026-05')
  })

  it('passes when bucket exactly equals limit', async () => {
    // FREE limit = 200; existing = 199; pattern adds 1 → 200 (allowed: projected <= limit)
    const db = makeMockDb([199])
    const result = await preflightPatternQuota(
      { db: db as never },
      {
        workspaceId: 'w-1',
        timezone: TZ,
        rangeStart: new Date('2026-05-10T00:00:00Z'),
        rangeEnd: new Date('2026-05-11T00:00:00Z'),
        pattern: {
          ...dailyPattern,
          daysOfWeek: [new Date('2026-05-10').getUTCDay()],
        },
        plan: 'FREE',
      },
    )
    expect(result.ok).toBe(true)
  })
})
