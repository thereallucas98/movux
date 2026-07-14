import { describe, expect, it, vi } from 'vitest'

import { removeWorkspaceMember } from '../remove-workspace-member.use-case'
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

describe('removeWorkspaceMember', () => {
  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await removeWorkspaceMember(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when membership does not exist', async () => {
    const result = await removeWorkspaceMember(
      adminMembershipRepo({ findById: vi.fn().mockResolvedValue(null) }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns NOT_FOUND when membership belongs to a different workspace', async () => {
    const result = await removeWorkspaceMember(
      adminMembershipRepo({
        findById: vi.fn().mockResolvedValue({
          id: MEMBER_ID,
          workspaceId: 'other-ws',
          userId: 'u',
          role: 'COLABORADOR',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns LAST_ADMIN when removing the last ADMIN', async () => {
    const result = await removeWorkspaceMember(
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
        countActiveAdmins: vi.fn().mockResolvedValue(1),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'LAST_ADMIN' })
  })

  it('soft-deletes member and writes audit on happy path', async () => {
    const membershipRepo = adminMembershipRepo({
      findById: vi.fn().mockResolvedValue({
        id: MEMBER_ID,
        workspaceId: WS_ID,
        userId: 'other-user',
        role: 'COLABORADOR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await removeWorkspaceMember(
      membershipRepo,
      auditRepo,
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )

    expect(result).toEqual({ success: true })
    expect(membershipRepo.softDelete).toHaveBeenCalledWith(
      MEMBER_ID,
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_MEMBER_REMOVED',
        entityId: MEMBER_ID,
      }),
      expect.any(Object),
    )
  })
})
