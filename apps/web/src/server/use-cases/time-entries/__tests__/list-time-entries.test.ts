import { describe, expect, it, vi } from 'vitest'

import { listTimeEntries } from '../list-time-entries.use-case'
import {
  makeTimeEntryRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'u-coord', role: 'USER' }

const coordAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COORDENADOR', isActive: true }),
})

describe('listTimeEntries', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await listTimeEntries(coordAuth, makeTimeEntryRepoMock(), null, {
      workspaceId: 'ws-1',
    })
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN when caller is COLABORADOR', async () => {
    const r = await listTimeEntries(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeTimeEntryRepoMock(),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('200 returns rows for COORD with default monthly range', async () => {
    const list = vi.fn().mockResolvedValue({
      data: [{ id: 'te-1' }, { id: 'te-2' }],
      nextCursor: null,
    })
    const r = await listTimeEntries(
      coordAuth,
      makeTimeEntryRepoMock({ listForWorkspace: list }),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toHaveLength(2)
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1' }),
      undefined,
      25,
    )
  })

  it('passes through explicit date range and userId filter', async () => {
    const list = vi.fn().mockResolvedValue({ data: [], nextCursor: null })
    const from = new Date('2026-09-01T00:00:00.000Z')
    const to = new Date('2026-09-30T23:59:59.000Z')
    await listTimeEntries(
      coordAuth,
      makeTimeEntryRepoMock({ listForWorkspace: list }),
      principal,
      { workspaceId: 'ws-1', from, to, userId: 'u-target' },
    )
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        from,
        to,
        userId: 'u-target',
      }),
      undefined,
      25,
    )
  })

  it('clamps limit to [1, 100]', async () => {
    const list = vi.fn().mockResolvedValue({ data: [], nextCursor: null })
    await listTimeEntries(
      coordAuth,
      makeTimeEntryRepoMock({ listForWorkspace: list }),
      principal,
      { workspaceId: 'ws-1', limit: 999 },
    )
    expect(list).toHaveBeenCalledWith(expect.anything(), undefined, 100)
    await listTimeEntries(
      coordAuth,
      makeTimeEntryRepoMock({ listForWorkspace: list }),
      principal,
      { workspaceId: 'ws-1', limit: 0 },
    )
    expect(list).toHaveBeenLastCalledWith(expect.anything(), undefined, 1)
  })
})
