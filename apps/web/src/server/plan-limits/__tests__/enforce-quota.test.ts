import { describe, expect, it, vi } from 'vitest'

import {
  enforcePerUploadAttachmentSize,
  enforceQuota,
  type TenantContext,
} from '../enforce-quota'
import { PlanLimitError, isPlanLimitError } from '../plan-limit-error'

const T_FREE: TenantContext = {
  id: 't-1',
  plan: 'FREE',
  gracePeriodUntil: null,
  timezone: 'America/Sao_Paulo',
}

function makeMockDb(overrides: Record<string, unknown> = {}) {
  return {
    workspace: { count: vi.fn().mockResolvedValue(0) },
    workspaceMembership: { count: vi.fn().mockResolvedValue(0) },
    category: { count: vi.fn().mockResolvedValue(0) },
    specialty: { count: vi.fn().mockResolvedValue(0) },
    schedule: { count: vi.fn().mockResolvedValue(0) },
    shift: { count: vi.fn().mockResolvedValue(0) },
    request: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi
        .fn()
        .mockResolvedValue({ _sum: { attachmentSizeBytes: null } }),
    },
    ...overrides,
  }
}

describe('enforceQuota — numeric resources', () => {
  it('passes when under limit', async () => {
    const db = makeMockDb()
    await expect(
      enforceQuota(
        { db: db as never },
        { tenant: T_FREE, resource: 'workspacesPerTenant' },
      ),
    ).resolves.toBeUndefined()
  })

  it('throws PlanLimitError when at limit (FREE workspaces=1, current=1)', async () => {
    const db = makeMockDb({
      workspace: { count: vi.fn().mockResolvedValue(1) },
    })
    try {
      await enforceQuota(
        { db: db as never },
        { tenant: T_FREE, resource: 'workspacesPerTenant' },
      )
      throw new Error('should have thrown')
    } catch (e) {
      expect(isPlanLimitError(e)).toBe(true)
      const err = e as PlanLimitError
      expect(err.code).toBe('PLAN_LIMIT_REACHED')
      if (err.meta.shape !== 'simple') throw new Error('expected simple meta')
      expect(err.meta.resource).toBe('workspacesPerTenant')
      expect(err.meta.limit).toBe(1)
      expect(err.meta.current).toBe(1)
      expect(err.meta.plan).toBe('FREE')
      expect(err.meta.gracePeriodExpired).toBe(false)
    }
  })

  it('CORPORATE passes regardless of current', async () => {
    const db = makeMockDb({
      workspace: { count: vi.fn().mockResolvedValue(9_999_999) },
    })
    const T_CORP: TenantContext = { ...T_FREE, plan: 'CORPORATE' }
    await expect(
      enforceQuota(
        { db: db as never },
        { tenant: T_CORP, resource: 'workspacesPerTenant' },
      ),
    ).resolves.toBeUndefined()
  })
})

describe('enforceQuota — boolean resource', () => {
  it('throws on FREE attempting tenantScopedCatalogs', async () => {
    const db = makeMockDb()
    try {
      await enforceQuota(
        { db: db as never },
        { tenant: T_FREE, resource: 'tenantScopedCatalogs' },
      )
      throw new Error('should have thrown')
    } catch (e) {
      const err = e as PlanLimitError
      expect(isPlanLimitError(err)).toBe(true)
      if (err.meta.shape !== 'boolean') throw new Error('expected boolean meta')
      expect(err.meta.resource).toBe('tenantScopedCatalogs')
      expect(err.meta.allowed).toBe(false)
      expect(err.meta.plan).toBe('FREE')
    }
  })

  it('CORPORATE passes tenantScopedCatalogs', async () => {
    const db = makeMockDb()
    const T_CORP: TenantContext = { ...T_FREE, plan: 'CORPORATE' }
    await expect(
      enforceQuota(
        { db: db as never },
        { tenant: T_CORP, resource: 'tenantScopedCatalogs' },
      ),
    ).resolves.toBeUndefined()
  })
})

describe('enforceQuota — grace period', () => {
  it('passes during active grace window (gracePeriodUntil > now) even when over limit', async () => {
    const db = makeMockDb({
      workspace: { count: vi.fn().mockResolvedValue(1) },
    })
    const future = new Date('2026-06-01T00:00:00Z')
    const T: TenantContext = {
      ...T_FREE,
      gracePeriodUntil: future,
    }
    const fakeNow = new Date('2026-05-15T12:00:00Z')
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      await expect(
        enforceQuota(
          { db: db as never },
          {
            tenant: T,
            resource: 'workspacesPerTenant',
            now: () => fakeNow,
          },
        ),
      ).resolves.toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
      const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
      expect(logged.event).toBe('plan_limit_grace')
      expect(logged.tenantId).toBe('t-1')
      expect(logged.resource).toBe('workspacesPerTenant')
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('throws with gracePeriodExpired:true when grace has passed', async () => {
    const db = makeMockDb({
      workspace: { count: vi.fn().mockResolvedValue(1) },
    })
    const past = new Date('2026-04-01T00:00:00Z')
    const T: TenantContext = {
      ...T_FREE,
      gracePeriodUntil: past,
    }
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await enforceQuota(
        { db: db as never },
        {
          tenant: T,
          resource: 'workspacesPerTenant',
          now: () => new Date('2026-05-15T12:00:00Z'),
        },
      )
      throw new Error('should have thrown')
    } catch (e) {
      const err = e as PlanLimitError
      expect(isPlanLimitError(err)).toBe(true)
      if (err.meta.shape !== 'simple') throw new Error('expected simple meta')
      expect(err.meta.gracePeriodExpired).toBe(true)
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('gracePeriodExpired is false when tenant never had a grace window', async () => {
    const db = makeMockDb({
      workspace: { count: vi.fn().mockResolvedValue(1) },
    })
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await enforceQuota(
        { db: db as never },
        { tenant: T_FREE, resource: 'workspacesPerTenant' },
      )
      throw new Error('should have thrown')
    } catch (e) {
      const err = e as PlanLimitError
      if (err.meta.shape !== 'simple') throw new Error('expected simple meta')
      expect(err.meta.gracePeriodExpired).toBe(false)
    } finally {
      consoleSpy.mockRestore()
    }
  })
})

describe('enforceQuota — input validation', () => {
  it('throws if workspace-scoped resource lacks workspaceId', async () => {
    const db = makeMockDb()
    await expect(
      enforceQuota(
        { db: db as never },
        { tenant: T_FREE, resource: 'membersPerWorkspace' },
      ),
    ).rejects.toThrow(/requires args.workspaceId/)
  })

  it('throws if asked to count attachmentSizeMB (uses dedicated check)', async () => {
    const db = makeMockDb()
    await expect(
      enforceQuota(
        { db: db as never },
        {
          tenant: T_FREE,
          resource: 'attachmentSizeMB',
          workspaceId: 'w-1',
        },
      ),
    ).rejects.toThrow(/not counter-enforced/)
  })
})

describe('enforcePerUploadAttachmentSize', () => {
  it('passes when under cap', () => {
    expect(() =>
      enforcePerUploadAttachmentSize('FREE', 1 * 1024 * 1024),
    ).not.toThrow()
  })

  it('throws when over cap', () => {
    try {
      enforcePerUploadAttachmentSize('FREE', 5 * 1024 * 1024)
      throw new Error('should have thrown')
    } catch (e) {
      const err = e as PlanLimitError
      expect(isPlanLimitError(err)).toBe(true)
      if (err.meta.shape !== 'simple') throw new Error('expected simple meta')
      expect(err.meta.resource).toBe('attachmentSizeMB')
      expect(err.meta.limit).toBe(2)
      expect(err.meta.current).toBe(5)
    }
  })
})
