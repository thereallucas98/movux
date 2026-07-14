import { describe, expect, it, vi } from 'vitest'

import { getTenantPlanLimits } from '../get-tenant-plan-limits.use-case'
import {
  makeMembershipRepoMock,
  makeTenantRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({ prisma: {} }))

const principal = { userId: 'user-1', role: 'USER' }

const baseTenant = {
  id: 't-1',
  name: 'Hospital X',
  timezone: 'America/Sao_Paulo',
  plan: 'FREE' as const,
  gracePeriodUntil: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function authorized() {
  return makeMembershipRepoMock({
    findActive: vi
      .fn()
      .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
  })
}

function makeCounters(workspaces: number) {
  return {
    db: {
      workspace: { count: vi.fn().mockResolvedValue(workspaces) },
      workspaceMembership: { count: vi.fn() },
      category: { count: vi.fn() },
      specialty: { count: vi.fn() },
      schedule: { count: vi.fn() },
      shift: { count: vi.fn() },
      request: { count: vi.fn(), aggregate: vi.fn() },
    } as never,
  }
}

describe('getTenantPlanLimits', () => {
  it('returns 401 when not authenticated', async () => {
    const tenantRepo = makeTenantRepoMock()
    const result = await getTenantPlanLimits(
      tenantRepo,
      makeMembershipRepoMock(),
      null,
      { tenantId: 't-1' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns 403 when not a SuperAdmin', async () => {
    const tenantRepo = makeTenantRepoMock()
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const result = await getTenantPlanLimits(
      tenantRepo,
      membershipRepo,
      principal,
      { tenantId: 't-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns 404 when tenant does not exist', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(null),
    })
    const result = await getTenantPlanLimits(
      tenantRepo,
      authorized(),
      principal,
      { tenantId: 't-1' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns FREE plan with workspaces 0/1 → percent=0, exhausted=false', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(baseTenant),
    })
    const result = await getTenantPlanLimits(
      tenantRepo,
      authorized(),
      principal,
      { tenantId: 't-1' },
      makeCounters(0),
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.plan).toBe('FREE')
    expect(result.data.gracePeriodUntil).toBeNull()
    expect(result.data.resources.workspaces).toEqual({
      limit: 1,
      current: 0,
      percent: 0,
      exhausted: false,
    })
    expect(result.data.resources.tenantScopedCatalogs).toEqual({
      allowed: false,
    })
  })

  it('reports exhausted=true when current >= limit', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(baseTenant),
    })
    const result = await getTenantPlanLimits(
      tenantRepo,
      authorized(),
      principal,
      { tenantId: 't-1' },
      makeCounters(1),
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.resources.workspaces.exhausted).toBe(true)
    expect(result.data.resources.workspaces.percent).toBe(100)
  })

  it('CORPORATE returns null limit and null percent', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue({ ...baseTenant, plan: 'CORPORATE' }),
    })
    const result = await getTenantPlanLimits(
      tenantRepo,
      authorized(),
      principal,
      { tenantId: 't-1' },
      makeCounters(99),
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.resources.workspaces.limit).toBeNull()
    expect(result.data.resources.workspaces.percent).toBeNull()
    expect(result.data.resources.tenantScopedCatalogs.allowed).toBe(true)
  })

  it('forwards gracePeriodUntil from the tenant', async () => {
    const future = new Date('2099-01-01')
    const tenantRepo = makeTenantRepoMock({
      findById: vi
        .fn()
        .mockResolvedValue({ ...baseTenant, gracePeriodUntil: future }),
    })
    const result = await getTenantPlanLimits(
      tenantRepo,
      authorized(),
      principal,
      { tenantId: 't-1' },
      makeCounters(0),
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.gracePeriodUntil).toBe(future)
  })

  it('rounds percent down (Math.floor)', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue({ ...baseTenant, plan: 'BUSINESS' }),
    })
    const result = await getTenantPlanLimits(
      tenantRepo,
      authorized(),
      principal,
      { tenantId: 't-1' },
      makeCounters(7), // 7 / 10 (BUSINESS) = 70%
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.resources.workspaces.percent).toBe(70)
  })
})
