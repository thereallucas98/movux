import { describe, expect, it, vi } from 'vitest'

import { unsetWorkspaceMemberSpecialty } from '../unset-workspace-member-specialty.use-case'
import {
  makeAuditRepoMock,
  makeUserSpecialtyRepoMock,
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

const membershipRow = {
  id: MEMBER_ID,
  workspaceId: WS_ID,
  userId: 'target-user',
  role: 'COLABORADOR',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function adminCoordRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
    findById: vi.fn().mockResolvedValue(membershipRow),
  })
}

describe('unsetWorkspaceMemberSpecialty', () => {
  it('returns FORBIDDEN when caller is COLABORADOR', async () => {
    const result = await unsetWorkspaceMemberSpecialty(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeUserSpecialtyRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns TARGET_MEMBER_NOT_FOUND when member missing', async () => {
    const result = await unsetWorkspaceMemberSpecialty(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
        findById: vi.fn().mockResolvedValue(null),
      }),
      makeUserSpecialtyRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'TARGET_MEMBER_NOT_FOUND' })
  })

  it('returns NOT_FOUND when no active UserSpecialty exists', async () => {
    const result = await unsetWorkspaceMemberSpecialty(
      adminCoordRepo(),
      makeUserSpecialtyRepoMock({
        findActiveByMember: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('soft-deletes and writes audit on happy path', async () => {
    const existing = {
      id: 'us-1',
      userId: 'target-user',
      workspaceId: WS_ID,
      specialtyId: 'sp-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const userSpecRepo = makeUserSpecialtyRepoMock({
      findActiveByMember: vi.fn().mockResolvedValue(existing),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await unsetWorkspaceMemberSpecialty(
      adminCoordRepo(),
      userSpecRepo,
      auditRepo,
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: true })
    expect(userSpecRepo.softDelete).toHaveBeenCalledWith(
      'us-1',
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_MEMBER_SPECIALTY_UNSET',
      }),
      expect.any(Object),
    )
  })
})
