import { describe, expect, it, vi } from 'vitest'

import { updateWorkspace } from '../update-workspace.use-case'
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
const WS_ID = 'ws-1'

describe('updateWorkspace', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await updateWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await updateWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COORDENADOR', isActive: true }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('updates workspace and writes audit', async () => {
    const updated = {
      id: WS_ID,
      tenantId: 't-1',
      name: 'New',
      timezone: 'America/Sao_Paulo',
      vertical: 'HOSPITAL',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const workspaceRepo = makeWorkspaceRepoMock({
      update: vi.fn().mockResolvedValue(updated),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await updateWorkspace(
      workspaceRepo,
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      auditRepo,
      principal,
      { workspaceId: WS_ID, data: { name: 'New' } },
    )

    expect(result.success).toBe(true)
    expect(workspaceRepo.update).toHaveBeenCalledWith(
      WS_ID,
      { name: 'New' },
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_UPDATED',
        entityType: 'WORKSPACE',
        entityId: WS_ID,
      }),
      expect.any(Object),
    )
  })
})
