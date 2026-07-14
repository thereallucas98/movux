import { describe, expect, it, vi } from 'vitest'

import { softDeleteWorkspace } from '../soft-delete-workspace.use-case'
import {
  makeAuditRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'user-1', role: 'USER' }

describe('softDeleteWorkspace', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await softDeleteWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: 'ws-1' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await softDeleteWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('cascades soft-delete to memberships and writes audit', async () => {
    const workspaceRepo = makeWorkspaceRepoMock()
    const workspaceMembershipRepo = makeWorkspaceMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await softDeleteWorkspace(
      workspaceRepo,
      workspaceMembershipRepo,
      auditRepo,
      principal,
      { workspaceId: 'ws-1' },
    )

    expect(result).toEqual({ success: true })
    expect(workspaceRepo.softDelete).toHaveBeenCalledWith(
      'ws-1',
      expect.any(Object),
    )
    expect(
      workspaceMembershipRepo.softDeleteAllByWorkspace,
    ).toHaveBeenCalledWith('ws-1', expect.any(Object))
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_DELETED',
        entityType: 'WORKSPACE',
        entityId: 'ws-1',
      }),
      expect.any(Object),
    )
  })
})
