import { describe, expect, it, vi } from 'vitest'

import { updateTenant } from '../update-tenant.use-case'
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

describe('updateTenant', () => {
  it('returns FORBIDDEN for non-SUPER_ADMIN caller', async () => {
    const tenantRepo = makeTenantRepoMock()
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await updateTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', data: { name: 'New Name' } },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
    expect(tenantRepo.update).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND when the tenant does not exist', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(null),
    })
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await updateTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', data: { name: 'X' } },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('updates and logs audit in a transaction when authorized', async () => {
    const updated = {
      id: 't-1',
      name: 'New Name',
      timezone: 'UTC',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue({ ...updated, name: 'Old Name' }),
      update: vi.fn().mockResolvedValue(updated),
    })
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await updateTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', data: { name: 'New Name' } },
    )

    expect(result).toEqual({ success: true, data: updated })
    expect(tenantRepo.update).toHaveBeenCalledWith(
      't-1',
      { name: 'New Name' },
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        action: 'TENANT_UPDATED',
        entityId: 't-1',
      }),
      expect.any(Object),
    )
  })
})
