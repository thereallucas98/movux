import { describe, expect, it, vi } from 'vitest'

import { removeTenantMember } from '../remove-member.use-case'
import {
  makeAuditRepoMock,
  makeMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'user-1', role: 'USER' }

describe('removeTenantMember', () => {
  it('returns FORBIDDEN for non-SUPER_ADMIN caller', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await removeTenantMember(
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', memberId: 'm-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when membership does not belong to tenant', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
      findById: vi.fn().mockResolvedValue({
        id: 'm-1',
        tenantId: 'other-tenant',
        userId: 'user-2',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await removeTenantMember(
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', memberId: 'm-1' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns LAST_SUPER_ADMIN when removing the last SUPER_ADMIN', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
      findById: vi.fn().mockResolvedValue({
        id: 'm-1',
        tenantId: 't-1',
        userId: 'user-1',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      countActiveSuperAdmins: vi.fn().mockResolvedValue(1),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await removeTenantMember(
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', memberId: 'm-1' },
    )
    expect(result).toEqual({ success: false, code: 'LAST_SUPER_ADMIN' })
    expect(membershipRepo.softDelete).not.toHaveBeenCalled()
  })

  it('removes membership + logs audit when not the last SUPER_ADMIN', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
      findById: vi.fn().mockResolvedValue({
        id: 'm-2',
        tenantId: 't-1',
        userId: 'user-3',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      countActiveSuperAdmins: vi.fn().mockResolvedValue(2),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await removeTenantMember(
      membershipRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', memberId: 'm-2' },
    )
    expect(result).toEqual({ success: true })
    expect(membershipRepo.softDelete).toHaveBeenCalledWith(
      'm-2',
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TENANT_MEMBER_REMOVED',
        entityId: 'm-2',
      }),
      expect.any(Object),
    )
  })
})
