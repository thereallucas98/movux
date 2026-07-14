import { describe, expect, it, vi } from 'vitest'

import { addTenantMember } from '../add-member.use-case'
import {
  makeAuditRepoMock,
  makeMembershipRepoMock,
  makeUserRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'user-1', role: 'USER' }

describe('addTenantMember', () => {
  it('returns FORBIDDEN for non-SUPER_ADMIN caller', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const userRepo = makeUserRepoMock()
    const auditRepo = makeAuditRepoMock()
    const result = await addTenantMember(
      membershipRepo,
      userRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', userId: 'user-2', role: 'SUPER_ADMIN' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns TARGET_USER_NOT_FOUND when target user does not exist', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const userRepo = makeUserRepoMock({
      findByIdWithRole: vi.fn().mockResolvedValue(null),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await addTenantMember(
      membershipRepo,
      userRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', userId: 'user-404', role: 'SUPER_ADMIN' },
    )
    expect(result).toEqual({
      success: false,
      code: 'TARGET_USER_NOT_FOUND',
    })
    expect(membershipRepo.create).not.toHaveBeenCalled()
  })

  it('returns ALREADY_MEMBER on Prisma P2002 unique violation', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
      create: vi.fn().mockRejectedValue({ code: 'P2002' }),
    })
    const userRepo = makeUserRepoMock({
      findByIdWithRole: vi
        .fn()
        .mockResolvedValue({ id: 'user-2', role: 'USER' }),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await addTenantMember(
      membershipRepo,
      userRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', userId: 'user-2', role: 'SUPER_ADMIN' },
    )
    expect(result).toEqual({ success: false, code: 'ALREADY_MEMBER' })
  })

  it('creates membership + audit log when authorized and target exists', async () => {
    const membership = {
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-2',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
      create: vi.fn().mockResolvedValue(membership),
    })
    const userRepo = makeUserRepoMock({
      findByIdWithRole: vi
        .fn()
        .mockResolvedValue({ id: 'user-2', role: 'USER' }),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await addTenantMember(
      membershipRepo,
      userRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', userId: 'user-2', role: 'SUPER_ADMIN' },
    )

    expect(result).toEqual({ success: true, data: membership })
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TENANT_MEMBER_ADDED',
        entityType: 'TENANT_MEMBERSHIP',
        entityId: 'm-1',
      }),
      expect.any(Object),
    )
  })
})
