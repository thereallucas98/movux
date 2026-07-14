import { describe, expect, it } from 'vitest'

import { computeCompositionStatus } from '../composition-match'

describe('computeCompositionStatus', () => {
  it('returns UNKNOWN when composition is empty', () => {
    expect(computeCompositionStatus({ specialtyId: 'sp-1' }, [])).toBe(
      'UNKNOWN',
    )
  })

  it('returns UNKNOWN when user has no specialty', () => {
    expect(computeCompositionStatus(null, [{ specialtyId: 'sp-1' }])).toBe(
      'UNKNOWN',
    )
  })

  it('returns UNKNOWN when user specialty is undefined (idiomatic null)', () => {
    expect(computeCompositionStatus(undefined, [{ specialtyId: 'sp-1' }])).toBe(
      'UNKNOWN',
    )
  })

  it('returns MATCH when user specialty is in composition', () => {
    expect(
      computeCompositionStatus({ specialtyId: 'sp-1' }, [
        { specialtyId: 'sp-1' },
        { specialtyId: 'sp-2' },
      ]),
    ).toBe('MATCH')
  })

  it('returns MISMATCH when user specialty is not in composition', () => {
    expect(
      computeCompositionStatus({ specialtyId: 'sp-x' }, [
        { specialtyId: 'sp-1' },
        { specialtyId: 'sp-2' },
      ]),
    ).toBe('MISMATCH')
  })
})
