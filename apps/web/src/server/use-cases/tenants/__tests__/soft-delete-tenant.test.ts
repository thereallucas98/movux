import { describe, expect, it, vi } from 'vitest'

import { softDeleteTenant } from '../soft-delete-tenant.use-case'
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

describe('softDeleteTenant', () => {
  it('returns FORBIDDEN for non-SUPER_ADMIN', async () => {
    const tenantRepo = makeTenantRepoMock()
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await softDeleteTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when tenant missing', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue(null),
    })
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await softDeleteTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('cascade soft-deletes memberships and logs audit', async () => {
    const tenantRepo = makeTenantRepoMock({
      findById: vi.fn().mockResolvedValue({
        id: 't-1',
        name: 'X',
        timezone: 'UTC',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await softDeleteTenant(
      tenantRepo,
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1' },
    )

    expect(result).toEqual({ success: true })
    expect(tenantRepo.softDelete).toHaveBeenCalledWith(
      't-1',
      expect.any(Object),
    )
    expect(membershipRepo.softDeleteAllByTenant).toHaveBeenCalledWith(
      't-1',
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TENANT_SOFT_DELETED',
        entityId: 't-1',
      }),
      expect.any(Object),
    )
  })
})
