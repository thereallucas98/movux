import { describe, expect, it, vi } from 'vitest'

import { listTenantsForUser } from '../list-tenants-for-user.use-case'
import { makeTenantRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

describe('listTenantsForUser', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const tenantRepo = makeTenantRepoMock()
    const result = await listTenantsForUser(tenantRepo, null, {})
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
    expect(tenantRepo.listForUser).not.toHaveBeenCalled()
  })

  it('returns the paginated list for the principal', async () => {
    const page = {
      data: [
        {
          id: 't-1',
          name: 'A',
          timezone: 'UTC',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      nextCursor: null,
    }
    const tenantRepo = makeTenantRepoMock({
      listForUser: vi.fn().mockResolvedValue(page),
    })

    const result = await listTenantsForUser(tenantRepo, principal, {
      cursor: null,
      limit: 10,
    })
    expect(result).toEqual({ success: true, data: page })
    expect(tenantRepo.listForUser).toHaveBeenCalledWith('user-1', null, 10)
  })

  it('uses default limit of 20 when not provided', async () => {
    const tenantRepo = makeTenantRepoMock({
      listForUser: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    })
    await listTenantsForUser(tenantRepo, principal, {})
    expect(tenantRepo.listForUser).toHaveBeenCalledWith('user-1', null, 20)
  })
})
