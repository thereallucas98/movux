import { describe, expect, it, vi } from 'vitest'

import { listWorkspacesForTenant } from '../list-workspaces-for-tenant.use-case'
import {
  makeMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

describe('listWorkspacesForTenant', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await listWorkspacesForTenant(
      makeWorkspaceRepoMock(),
      makeMembershipRepoMock(),
      null,
      { tenantId: 't-1' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not SUPER_ADMIN of the tenant', async () => {
    const result = await listWorkspacesForTenant(
      makeWorkspaceRepoMock(),
      makeMembershipRepoMock({ findActive: vi.fn().mockResolvedValue(null) }),
      principal,
      { tenantId: 't-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns workspaces when authorized', async () => {
    const workspaceRepo = makeWorkspaceRepoMock({
      listForTenant: vi
        .fn()
        .mockResolvedValue({ data: [{ id: 'ws-1' }], nextCursor: null }),
    })
    const result = await listWorkspacesForTenant(
      workspaceRepo,
      makeMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
      }),
      principal,
      { tenantId: 't-1', limit: 10 },
    )
    expect(result.success).toBe(true)
    expect(workspaceRepo.listForTenant).toHaveBeenCalledWith('t-1', null, 10)
  })
})
