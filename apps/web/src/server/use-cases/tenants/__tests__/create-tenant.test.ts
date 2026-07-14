import { describe, expect, it, vi } from 'vitest'

import { createTenant } from '../create-tenant.use-case'
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
  },
}))

const principal = { userId: 'user-1', role: 'USER' }

describe('createTenant', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const tenantRepo = makeTenantRepoMock()
    const membershipRepo = makeMembershipRepoMock()
    const auditRepo = makeAuditRepoMock()

    const result = await createTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      null,
      { name: 'Hospital X' },
    )

    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
    expect(tenantRepo.create).not.toHaveBeenCalled()
  })

  it('creates tenant + SUPER_ADMIN membership + audit log in a transaction', async () => {
    const tenant = {
      id: 't-1',
      name: 'Hospital X',
      timezone: 'America/Sao_Paulo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const membership = {
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const tenantRepo = makeTenantRepoMock({
      create: vi.fn().mockResolvedValue(tenant),
    })
    const membershipRepo = makeMembershipRepoMock({
      create: vi.fn().mockResolvedValue(membership),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await createTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      principal,
      { name: 'Hospital X' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tenant).toEqual(tenant)
      expect(result.data.membership).toEqual(membership)
    }
    expect(tenantRepo.create).toHaveBeenCalledWith(
      { name: 'Hospital X', timezone: undefined },
      expect.any(Object),
    )
    expect(membershipRepo.create).toHaveBeenCalledWith(
      { tenantId: 't-1', userId: 'user-1', role: 'SUPER_ADMIN' },
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        action: 'TENANT_CREATED',
        entityType: 'TENANT',
        entityId: 't-1',
      }),
      expect.any(Object),
    )
  })

  it('passes optional timezone through to the repo', async () => {
    const tenantRepo = makeTenantRepoMock({
      create: vi.fn().mockResolvedValue({
        id: 't-2',
        name: 'Academia Y',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const membershipRepo = makeMembershipRepoMock({
      create: vi.fn().mockResolvedValue({
        id: 'm-2',
        tenantId: 't-2',
        userId: 'user-1',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const auditRepo = makeAuditRepoMock()

    await createTenant(tenantRepo, membershipRepo, auditRepo, principal, {
      name: 'Academia Y',
      timezone: 'America/New_York',
    })

    expect(tenantRepo.create).toHaveBeenCalledWith(
      { name: 'Academia Y', timezone: 'America/New_York' },
      expect.any(Object),
    )
  })
})
