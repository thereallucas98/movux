import { describe, expect, it } from 'vitest'

import { parsePlanLimitMeta } from '../parse-plan-limit-meta'

describe('parsePlanLimitMeta — fallback', () => {
  it('returns generic fallback for undefined', () => {
    expect(parsePlanLimitMeta(undefined).description).toBe(
      'Limite do plano atingido.',
    )
  })

  it('returns generic fallback for null', () => {
    expect(parsePlanLimitMeta(null).description).toBe(
      'Limite do plano atingido.',
    )
  })

  it('returns generic fallback for unknown shape', () => {
    expect(
      parsePlanLimitMeta({ shape: 'unknown', resource: 'x' }).description,
    ).toBe('Limite do plano atingido.')
  })
})

describe('parsePlanLimitMeta — simple shape', () => {
  it('formats workspacesPerTenant FREE 1/1 with upgrade hint to Small Team', () => {
    const r = parsePlanLimitMeta({
      shape: 'simple',
      resource: 'workspacesPerTenant',
      plan: 'FREE',
      limit: 1,
      current: 1,
    })
    expect(r.description).toContain('workspaces')
    expect(r.description).toContain('1 de 1')
    expect(r.description).toContain('Free')
    expect(r.description).toContain('Small Team')
  })

  it('Corporate has no next-plan upgrade hint', () => {
    const r = parsePlanLimitMeta({
      shape: 'simple',
      resource: 'storageMBPerWorkspace',
      plan: 'CORPORATE',
      limit: 40960,
      current: 40960,
    })
    expect(r.description).not.toContain('upgrade para')
  })

  it('appends grace-expired note when gracePeriodExpired=true', () => {
    const r = parsePlanLimitMeta({
      shape: 'simple',
      resource: 'membersPerWorkspace',
      plan: 'FREE',
      limit: 20,
      current: 21,
      gracePeriodExpired: true,
    })
    expect(r.description).toContain('grace expirou')
  })
})

describe('parsePlanLimitMeta — boolean shape', () => {
  it('formats tenantScopedCatalogs as Corporate-only', () => {
    const r = parsePlanLimitMeta({
      shape: 'boolean',
      resource: 'tenantScopedCatalogs',
      plan: 'FREE',
      allowed: false,
    })
    expect(r.description).toContain('catálogo no nível do tenant')
    expect(r.description).toContain('Corporate')
  })
})

describe('parsePlanLimitMeta — pattern shape', () => {
  it('reports the violating month bucket and the suggestion', () => {
    const r = parsePlanLimitMeta({
      shape: 'pattern',
      resource: 'shiftsPerMonthPerWorkspace',
      plan: 'FREE',
      perMonth: {
        '2026-05': { existing: 195, requested: 30, projected: 225, limit: 200 },
      },
      suggestion: {
        adjustedEndDate: '2026-05-22',
        wouldGenerate: 7,
      },
    })
    expect(r.description).toContain('2026-05')
    expect(r.description).toContain('225/200')
    expect(r.description).toContain('2026-05-22')
    expect(r.description).toContain('7 plantões')
  })

  it('handles Date object in suggestion.adjustedEndDate', () => {
    const r = parsePlanLimitMeta({
      shape: 'pattern',
      resource: 'shiftsPerMonthPerWorkspace',
      plan: 'FREE',
      perMonth: {
        '2026-06': { existing: 195, requested: 30, projected: 225, limit: 200 },
      },
      suggestion: {
        adjustedEndDate: new Date('2026-06-01T00:00:00Z'),
        wouldGenerate: 5,
      },
    })
    expect(r.description).toContain('2026-06-01')
  })
})
