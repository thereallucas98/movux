import { describe, expect, it, vi } from 'vitest'

import { getWorkspacePlanLimits } from '../get-workspace-plan-limits.use-case'
import {
  makeTenantRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({ prisma: {} }))

const principal = { userId: 'user-1', role: 'USER' }

const baseWorkspace = {
  id: 'w-1',
  tenantId: 't-1',
  name: 'Hospital Central',
  vertical: 'HOSPITAL' as const,
  timezone: 'America/Sao_Paulo',
  clockToleranceMinutes: 15,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

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
  return makeWorkspaceMembershipRepoMock({
    findActive: vi
      .fn()
      .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
  })
}

function makeCounters(values: {
  members?: number
  categories?: number
  specialties?: number
  schedules?: number
  shifts?: number
  requests?: number
  storageBytes?: number
}) {
  return {
    deps: {
      db: {
        workspace: { count: vi.fn() },
        workspaceMembership: {
          count: vi.fn().mockResolvedValue(values.members ?? 0),
        },
        category: { count: vi.fn().mockResolvedValue(values.categories ?? 0) },
        specialty: {
          count: vi.fn().mockResolvedValue(values.specialties ?? 0),
        },
        schedule: { count: vi.fn().mockResolvedValue(values.schedules ?? 0) },
        shift: { count: vi.fn().mockResolvedValue(values.shifts ?? 0) },
        request: {
          count: vi.fn().mockResolvedValue(values.requests ?? 0),
          aggregate: vi.fn().mockResolvedValue({
            _sum: {
              attachmentSizeBytes: values.storageBytes ?? null,
            },
          }),
        },
      } as never,
    },
    now: new Date('2026-05-15T12:00:00Z'),
  }
}

describe('getWorkspacePlanLimits', () => {
  it('returns 401 when not authenticated', async () => {
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeTenantRepoMock(),
      null,
      { workspaceId: 'w-1' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns 403 when not a workspace member', async () => {
    const repo = makeWorkspaceMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock(),
      repo,
      makeTenantRepoMock(),
      principal,
      { workspaceId: 'w-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns 404 when workspace does not exist', async () => {
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      authorized(),
      makeTenantRepoMock(),
      principal,
      { workspaceId: 'w-1' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns full FREE-plan resource map for a fresh workspace', async () => {
    const counters = makeCounters({})
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(baseWorkspace),
      }),
      authorized(),
      makeTenantRepoMock({
        findById: vi.fn().mockResolvedValue(baseTenant),
      }),
      principal,
      { workspaceId: 'w-1' },
      counters,
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.plan).toBe('FREE')
    expect(result.data.resources.members).toEqual({
      limit: 20,
      current: 0,
      percent: 0,
      exhausted: false,
    })
    expect(result.data.resources.categories.limit).toBe(5)
    expect(result.data.resources.specialties.limit).toBe(5)
    expect(result.data.resources.activeSchedules.limit).toBe(2)
    expect(result.data.resources.shiftsThisMonth.limit).toBe(200)
    expect(result.data.resources.requestsThisMonth.limit).toBe(40)
    expect(result.data.resources.storageMB.limit).toBe(100)
  })

  it('exhausted: true when current >= limit', async () => {
    const counters = makeCounters({ members: 20 })
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(baseWorkspace),
      }),
      authorized(),
      makeTenantRepoMock({
        findById: vi.fn().mockResolvedValue(baseTenant),
      }),
      principal,
      { workspaceId: 'w-1' },
      counters,
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.resources.members.exhausted).toBe(true)
    expect(result.data.resources.members.percent).toBe(100)
  })

  it('CORPORATE has unlimited resources but a finite storage limit', async () => {
    const counters = makeCounters({ members: 9999 })
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(baseWorkspace),
      }),
      authorized(),
      makeTenantRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...baseTenant, plan: 'CORPORATE' }),
      }),
      principal,
      { workspaceId: 'w-1' },
      counters,
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.resources.members.limit).toBeNull()
    expect(result.data.resources.members.percent).toBeNull()
    expect(result.data.resources.storageMB.limit).toBe(40960)
  })

  it('forwards gracePeriodUntil from the parent tenant', async () => {
    const future = new Date('2099-01-01')
    const counters = makeCounters({})
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(baseWorkspace),
      }),
      authorized(),
      makeTenantRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...baseTenant, gracePeriodUntil: future }),
      }),
      principal,
      { workspaceId: 'w-1' },
      counters,
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.gracePeriodUntil).toBe(future)
  })

  it('storage counter converts bytes to MB rounded up', async () => {
    const counters = makeCounters({
      storageBytes: 1.5 * 1024 * 1024, // 1.5 MB
    })
    const result = await getWorkspacePlanLimits(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(baseWorkspace),
      }),
      authorized(),
      makeTenantRepoMock({
        findById: vi.fn().mockResolvedValue(baseTenant),
      }),
      principal,
      { workspaceId: 'w-1' },
      counters,
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.resources.storageMB.current).toBe(2)
  })
})
