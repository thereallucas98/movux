import { describe, expect, it, vi } from 'vitest'

import { listTenantMembers } from '../list-members.use-case'
import { makeMembershipRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

describe('listTenantMembers', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const membershipRepo = makeMembershipRepoMock()
    const result = await listTenantMembers(membershipRepo, null, {
      tenantId: 't-1',
    })
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN for non-SUPER_ADMIN', async () => {
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const result = await listTenantMembers(membershipRepo, principal, {
      tenantId: 't-1',
    })
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
    expect(membershipRepo.listActiveByTenant).not.toHaveBeenCalled()
  })

  it('returns paginated list when authorized', async () => {
    const page = {
      data: [
        {
          id: 'm-1',
          role: 'SUPER_ADMIN',
          isActive: true,
          createdAt: new Date(),
          user: { id: 'u-1', email: 'a@b.com', fullName: 'Alice' },
        },
      ],
      nextCursor: 'abc',
    }
    const membershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
      listActiveByTenant: vi.fn().mockResolvedValue(page),
    })
    const result = await listTenantMembers(membershipRepo, principal, {
      tenantId: 't-1',
      cursor: null,
      limit: 5,
    })
    expect(result).toEqual({ success: true, data: page })
    expect(membershipRepo.listActiveByTenant).toHaveBeenCalledWith(
      't-1',
      null,
      5,
    )
  })
})
