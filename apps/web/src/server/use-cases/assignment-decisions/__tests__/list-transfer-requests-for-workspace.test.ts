import { describe, expect, it, vi } from 'vitest'

import { listTransferRequestsForWorkspace } from '../list-transfer-requests-for-workspace.use-case'
import {
  makeTransferRequestRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'admin-1', role: 'USER' }

describe('listTransferRequestsForWorkspace', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await listTransferRequestsForWorkspace(
      makeWorkspaceMembershipRepoMock(),
      makeTransferRequestRepoMock(),
      null,
      { workspaceId: 'ws-1', filter: {}, limit: 20 },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN for colab', async () => {
    const r = await listTransferRequestsForWorkspace(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeTransferRequestRepoMock(),
      principal,
      { workspaceId: 'ws-1', filter: {}, limit: 20 },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('happy: passes filter through', async () => {
    const listMock = vi.fn().mockResolvedValue({ data: [], nextCursor: null })
    const r = await listTransferRequestsForWorkspace(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      makeTransferRequestRepoMock({ listForWorkspace: listMock }),
      principal,
      {
        workspaceId: 'ws-1',
        filter: { status: 'PENDING' },
        cursor: 'abc',
        limit: 50,
      },
    )
    expect(r.success).toBe(true)
    expect(listMock).toHaveBeenCalledWith(
      'ws-1',
      { status: 'PENDING' },
      'abc',
      50,
    )
  })

  it('happy: COORDENADOR allowed', async () => {
    const r = await listTransferRequestsForWorkspace(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COORDENADOR', isActive: true }),
      }),
      makeTransferRequestRepoMock(),
      principal,
      { workspaceId: 'ws-1', filter: {}, limit: 20 },
    )
    expect(r.success).toBe(true)
  })
})
