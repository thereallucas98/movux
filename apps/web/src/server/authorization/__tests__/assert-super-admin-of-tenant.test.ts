import { describe, expect, it, vi } from 'vitest'

import {
  assertSuperAdminOfTenant,
  type MembershipLookup,
  type Principal,
} from '../assert-super-admin-of-tenant'

const TENANT_ID = 'tenant-1'
const USER_ID = 'user-1'

function makeMembershipRepo(
  returnValue: { role: string; isActive: boolean } | null,
): MembershipLookup {
  return {
    findActive: vi.fn().mockResolvedValue(returnValue),
  }
}

describe('assertSuperAdminOfTenant', () => {
  const principal: Principal = { userId: USER_ID, role: 'USER' }

  it('returns UNAUTHENTICATED when principal is null', async () => {
    const repo = makeMembershipRepo(null)
    const result = await assertSuperAdminOfTenant(repo, null, TENANT_ID)
    expect(result).toEqual({ authorized: false, code: 'UNAUTHENTICATED' })
    expect(repo.findActive).not.toHaveBeenCalled()
  })

  it('returns FORBIDDEN when no membership is found', async () => {
    const repo = makeMembershipRepo(null)
    const result = await assertSuperAdminOfTenant(repo, principal, TENANT_ID)
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
    expect(repo.findActive).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      userId: USER_ID,
    })
  })

  it('returns FORBIDDEN when membership is inactive', async () => {
    const repo = makeMembershipRepo({ role: 'SUPER_ADMIN', isActive: false })
    const result = await assertSuperAdminOfTenant(repo, principal, TENANT_ID)
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns FORBIDDEN when role is not SUPER_ADMIN', async () => {
    const repo = makeMembershipRepo({ role: 'ADMIN', isActive: true })
    const result = await assertSuperAdminOfTenant(repo, principal, TENANT_ID)
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns authorized when principal has active SUPER_ADMIN membership', async () => {
    const repo = makeMembershipRepo({ role: 'SUPER_ADMIN', isActive: true })
    const result = await assertSuperAdminOfTenant(repo, principal, TENANT_ID)
    expect(result).toEqual({ authorized: true })
  })
})
