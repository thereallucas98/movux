import { describe, expect, it, vi } from 'vitest'

import { getTenantById } from '../get-tenant-by-id.use-case'
import {
  makeMembershipRepoMock,
  makeTenantRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

describe('getTenantById', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const tenantRepo = makeTenantRepoMock()
    const membershipRepo = makeMembershipRepoMock()
    const result = await getTenantById(tenantRepo, membershipRepo, null, {
      tenantId: 't-1',
    })
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when principal is not a SUPER_ADMIN of the tenant', async () => {
    const tenantRepo = makeTenantRepoMock()
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const result = await getTenantById(tenantRepo, membershipRepo, principal, {
      tenantId: 't-1',
    })
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
    expect(tenantRepo.findByIdWithMembersPage).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND when the tenant does not exist (but auth passes)', async () => {
    const tenantRepo = makeTenantRepoMock({
      findByIdWithMembersPage: vi.fn().mockResolvedValue(null),
    })
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const result = await getTenantById(tenantRepo, membershipRepo, principal, {
      tenantId: 't-1',
    })
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns the tenant with members when authorized', async () => {
    const tenantData = {
      id: 't-1',
      name: 'Hospital',
      timezone: 'UTC',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberships: [],
      nextMembershipCursor: null,
    }
    const tenantRepo = makeTenantRepoMock({
      findByIdWithMembersPage: vi.fn().mockResolvedValue(tenantData),
    })
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const result = await getTenantById(tenantRepo, membershipRepo, principal, {
      tenantId: 't-1',
      membersLimit: 5,
    })
    expect(result).toEqual({ success: true, data: tenantData })
    expect(tenantRepo.findByIdWithMembersPage).toHaveBeenCalledWith(
      't-1',
      null,
      5,
    )
  })
})
