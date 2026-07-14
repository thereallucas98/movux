import { describe, expect, it } from 'vitest'

import { getBannerState } from '../get-banner-state'

describe('getBannerState — null limit (unlimited)', () => {
  it('returns hidden for any current when limit is null', () => {
    expect(getBannerState(0, null)).toBe('hidden')
    expect(getBannerState(9_999_999, null)).toBe('hidden')
  })
})

describe('getBannerState — destructive at exhaustion', () => {
  it('returns destructive when current === limit', () => {
    expect(getBannerState(1, 1)).toBe('destructive')
    expect(getBannerState(20, 20)).toBe('destructive')
    expect(getBannerState(200, 200)).toBe('destructive')
  })

  it('returns destructive when current > limit (over-quota during grace)', () => {
    expect(getBannerState(2, 1)).toBe('destructive')
    expect(getBannerState(50, 20)).toBe('destructive')
  })
})

describe('getBannerState — small scale (limit ≤ 5)', () => {
  it('warning when remaining ≤ 1', () => {
    // limit=1: 0/1 → warning (remaining=1)
    expect(getBannerState(0, 1)).toBe('warning')
    // limit=5: 4/5 → warning (remaining=1)
    expect(getBannerState(4, 5)).toBe('warning')
  })

  it('hidden when remaining > 1', () => {
    // limit=5: 3/5 → hidden (remaining=2)
    expect(getBannerState(3, 5)).toBe('hidden')
    expect(getBannerState(0, 5)).toBe('hidden')
  })
})

describe('getBannerState — medium scale (6 ≤ limit ≤ 50)', () => {
  it('hidden when below 80%', () => {
    // 15/20 = 75% → hidden
    expect(getBannerState(15, 20)).toBe('hidden')
    // 39/50 = 78% → hidden
    expect(getBannerState(39, 50)).toBe('hidden')
  })

  it('warning at exactly 80%', () => {
    expect(getBannerState(16, 20)).toBe('warning') // 80%
    expect(getBannerState(40, 50)).toBe('warning') // 80%
  })

  it('warning above 80% but below 100%', () => {
    expect(getBannerState(19, 20)).toBe('warning') // 95%
  })
})

describe('getBannerState — large scale (limit > 50)', () => {
  it('hidden when below 90%', () => {
    expect(getBannerState(175, 200)).toBe('hidden') // 87.5%
    expect(getBannerState(159, 200)).toBe('hidden') // 79.5% — would be warning at 80%, but threshold is 90%
  })

  it('warning at exactly 90%', () => {
    expect(getBannerState(180, 200)).toBe('warning') // 90%
    expect(getBannerState(900, 1000)).toBe('warning') // 90%
  })

  it('warning above 90% but below 100%', () => {
    expect(getBannerState(199, 200)).toBe('warning') // 99.5%
  })
})

describe('getBannerState — boundary between categories', () => {
  it('limit=5 uses small-scale rule (boundary)', () => {
    expect(getBannerState(3, 5)).toBe('hidden') // remaining=2
    expect(getBannerState(4, 5)).toBe('warning') // remaining=1
  })

  it('limit=6 uses medium-scale rule', () => {
    // 4/6 = 66.6% → hidden under 80% rule
    expect(getBannerState(4, 6)).toBe('hidden')
    // 5/6 = 83.3% → warning under 80% rule
    expect(getBannerState(5, 6)).toBe('warning')
  })

  it('limit=50 uses medium-scale rule (boundary)', () => {
    expect(getBannerState(40, 50)).toBe('warning') // 80%
  })

  it('limit=51 uses large-scale rule', () => {
    // 41/51 = 80.4% — under 90% threshold → hidden
    expect(getBannerState(41, 51)).toBe('hidden')
    // 46/51 = 90.2% → warning
    expect(getBannerState(46, 51)).toBe('warning')
  })
})
