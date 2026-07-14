import { describe, expect, it, vi } from 'vitest'

import { changeTenantPlan } from '../change-tenant-plan.use-case'
import {
  makeAuditRepoMock,
  makeMembershipRepoMock,
  makeTenantRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
    workspace: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
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
  },
}))

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

function setupAuthorizedMembership() {
  return makeMembershipRepoMock({
    findActive: vi
      .fn()
      .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
  })
}

describe('changeTenantPlan', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const tenantRepo = makeTenantRepoMock()
    const result = await changeTenantPlan(
      tenantRepo,
      makeMembershipRepoMock(),
      makeAuditRepoMock(),
      null,
      { tenantId: 't-1', plan: 'SMALL_TEAM' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when principal is not SUPER_ADMIN', async () => {
    const tenantRepo = makeTenantRepoMock()
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const result = await changeTenantPlan(
      tenantRepo,
      membershipRepo,
      makeAuditRepoMock(),
      principal,
      { tenantId: 't-1', plan: 'SMALL_TEAM' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when tenant does not exist', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(null),
    })
    const result = await changeTenantPlan(
      tenantRepo,
      setupAuthorizedMembership(),
      makeAuditRepoMock(),
      principal,
      { tenantId: 't-1', plan: 'SMALL_TEAM' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('idempotent: same-plan request returns success without writing', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(baseTenant),
    })
    const result = await changeTenantPlan(
      tenantRepo,
      setupAuthorizedMembership(),
      makeAuditRepoMock(),
      principal,
      { tenantId: 't-1', plan: 'FREE' },
    )
    expect(result.success).toBe(true)
    expect(tenantRepo.updatePlan).not.toHaveBeenCalled()
  })

  it('upgrade FREE → SMALL_TEAM clears any stale grace and persists', async () => {
    const tenant = { ...baseTenant, gracePeriodUntil: new Date('2099-01-01') }
    const updated = {
      ...tenant,
      plan: 'SMALL_TEAM' as const,
      gracePeriodUntil: null,
    }
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(tenant),
      updatePlan: vi.fn().mockResolvedValue(updated),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await changeTenantPlan(
      tenantRepo,
      setupAuthorizedMembership(),
      auditRepo,
      principal,
      { tenantId: 't-1', plan: 'SMALL_TEAM' },
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.previousPlan).toBe('FREE')
    expect(result.data.gracePeriodUntil).toBeNull()
    expect(tenantRepo.updatePlan).toHaveBeenCalledWith(
      't-1',
      'SMALL_TEAM',
      null,
      expect.anything(),
    )
    expect(auditRepo.log).toHaveBeenCalled()
  })

  it('downgrade with no violations clears any stale grace', async () => {
    const tenant = {
      ...baseTenant,
      plan: 'SMALL_TEAM' as const,
      gracePeriodUntil: new Date('2099-01-01'),
    }
    const updated = { ...tenant, plan: 'FREE' as const, gracePeriodUntil: null }
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(tenant),
      updatePlan: vi.fn().mockResolvedValue(updated),
    })
    const result = await changeTenantPlan(
      tenantRepo,
      setupAuthorizedMembership(),
      makeAuditRepoMock(),
      principal,
      { tenantId: 't-1', plan: 'FREE' },
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.violations).toEqual([])
    expect(result.data.gracePeriodUntil).toBeNull()
  })

  it('audit log captures from, to, gracePeriodUntil, violations', async () => {
    const tenant = { ...baseTenant, plan: 'SMALL_TEAM' as const }
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(tenant),
      updatePlan: vi.fn().mockResolvedValue({ ...tenant, plan: 'BUSINESS' }),
    })
    const auditRepo = makeAuditRepoMock()
    await changeTenantPlan(
      tenantRepo,
      setupAuthorizedMembership(),
      auditRepo,
      principal,
      { tenantId: 't-1', plan: 'BUSINESS' },
    )
    expect(auditRepo.log).toHaveBeenCalled()
    const call = (auditRepo.log as ReturnType<typeof vi.fn>).mock.calls[0]
    const args = call[0] as {
      action: string
      metadata: { from: string; to: string }
    }
    expect(args.action).toBe('TENANT_PLAN_CHANGED')
    expect(args.metadata.from).toBe('SMALL_TEAM')
    expect(args.metadata.to).toBe('BUSINESS')
  })
})
