import { describe, expect, it, vi } from 'vitest'

import { listWorkspacesForUser } from '../list-workspaces-for-user.use-case'
import { makeWorkspaceRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

describe('listWorkspacesForUser', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await listWorkspacesForUser(
      makeWorkspaceRepoMock(),
      null,
      {},
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns empty list when user has no workspaces', async () => {
    const repo = makeWorkspaceRepoMock({
      listForUser: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    })
    const result = await listWorkspacesForUser(repo, principal, {})
    expect(result).toEqual({
      success: true,
      data: { data: [], nextCursor: null },
    })
    expect(repo.listForUser).toHaveBeenCalledWith('user-1', null, 20)
  })

  it('respects cursor and limit', async () => {
    const repo = makeWorkspaceRepoMock({
      listForUser: vi.fn().mockResolvedValue({
        data: [{ id: 'ws-1' }],
        nextCursor: 'abc',
      }),
    })
    await listWorkspacesForUser(repo, principal, { cursor: 'xyz', limit: 5 })
    expect(repo.listForUser).toHaveBeenCalledWith('user-1', 'xyz', 5)
  })
})
