import { describe, expect, it } from 'vitest'

import { computeInitialStep } from '../compute-initial-step'

describe('computeInitialStep', () => {
  it('returns step 1 when the user owns no tenants', () => {
    expect(computeInitialStep([])).toEqual({ step: 1 })
  })

  it('returns step 2 with the only tenant when there is exactly one', () => {
    const tenant = { id: 't-1', createdAt: new Date('2026-04-29T10:00:00Z') }
    expect(computeInitialStep([tenant])).toEqual({
      step: 2,
      tenantId: 't-1',
    })
  })

  it('picks the most-recent owned tenant when there are multiple', () => {
    const tenants = [
      { id: 'old', createdAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'newest', createdAt: new Date('2026-04-29T10:00:00Z') },
      { id: 'mid', createdAt: new Date('2025-12-01T00:00:00Z') },
    ]
    expect(computeInitialStep(tenants)).toEqual({
      step: 2,
      tenantId: 'newest',
    })
  })

  it('does not mutate the input array', () => {
    const tenants = [
      { id: 'a', createdAt: new Date('2025-01-01') },
      { id: 'b', createdAt: new Date('2025-06-01') },
    ]
    const snapshot = [...tenants]
    computeInitialStep(tenants)
    expect(tenants).toEqual(snapshot)
  })
})
