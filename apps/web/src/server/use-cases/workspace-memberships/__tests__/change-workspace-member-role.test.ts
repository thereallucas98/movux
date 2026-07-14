import { describe, expect, it, vi } from 'vitest'

import { changeWorkspaceMemberRole } from '../change-workspace-member-role.use-case'
import {
  makeAuditRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'caller-1', role: 'USER' }
const WS_ID = 'ws-1'
const MEMBER_ID = 'mem-1'

function adminMembershipRepo(
  overrides: Partial<ReturnType<typeof makeWorkspaceMembershipRepoMock>> = {},
) {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
    ...overrides,
  })
}

describe('changeWorkspaceMemberRole', () => {
  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await changeWorkspaceMemberRole(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, role: 'ADMIN' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when membership does not exist', async () => {
    const result = await changeWorkspaceMemberRole(
      adminMembershipRepo({ findById: vi.fn().mockResolvedValue(null) }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, role: 'ADMIN' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns NOT_FOUND when membership belongs to a different workspace', async () => {
    const result = await changeWorkspaceMemberRole(
      adminMembershipRepo({
        findById: vi.fn().mockResolvedValue({
          id: MEMBER_ID,
          workspaceId: 'other-ws',
          userId: 'u',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, role: 'COLABORADOR' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns LAST_ADMIN when demoting the last ADMIN', async () => {
    const result = await changeWorkspaceMemberRole(
      adminMembershipRepo({
        findById: vi.fn().mockResolvedValue({
          id: MEMBER_ID,
          workspaceId: WS_ID,
          userId: 'other-user',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        countActiveAdmins: vi.fn().mockResolvedValue(1),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, role: 'COLABORADOR' },
    )
    expect(result).toEqual({ success: false, code: 'LAST_ADMIN' })
  })

  it('returns CANNOT_DEMOTE_SELF when caller targets own membership', async () => {
    const result = await changeWorkspaceMemberRole(
      adminMembershipRepo({
        findById: vi.fn().mockResolvedValue({
          id: MEMBER_ID,
          workspaceId: WS_ID,
          userId: 'caller-1',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        countActiveAdmins: vi.fn().mockResolvedValue(5),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, role: 'COORDENADOR' },
    )
    expect(result).toEqual({ success: false, code: 'CANNOT_DEMOTE_SELF' })
  })

  it('updates role and writes audit on happy path', async () => {
    const updated = {
      id: MEMBER_ID,
      workspaceId: WS_ID,
      userId: 'other-user',
      role: 'COORDENADOR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const membershipRepo = adminMembershipRepo({
      findById: vi.fn().mockResolvedValue({
        id: MEMBER_ID,
        workspaceId: WS_ID,
        userId: 'other-user',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      countActiveAdmins: vi.fn().mockResolvedValue(3),
      updateRole: vi.fn().mockResolvedValue(updated),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await changeWorkspaceMemberRole(
      membershipRepo,
      auditRepo,
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, role: 'COORDENADOR' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(updated)
    }
    expect(membershipRepo.updateRole).toHaveBeenCalledWith(
      MEMBER_ID,
      'COORDENADOR',
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_MEMBER_ROLE_CHANGED',
        entityId: MEMBER_ID,
        metadata: expect.objectContaining({
          fromRole: 'ADMIN',
          toRole: 'COORDENADOR',
        }),
      }),
      expect.any(Object),
    )
  })
})
