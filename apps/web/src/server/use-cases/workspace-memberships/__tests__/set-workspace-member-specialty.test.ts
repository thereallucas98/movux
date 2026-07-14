import { describe, expect, it, vi } from 'vitest'

import { setWorkspaceMemberSpecialty } from '../set-workspace-member-specialty.use-case'
import {
  makeAuditRepoMock,
  makeSpecialtyRepoMock,
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
const SP_ID = 'sp-1'
const TARGET_USER_ID = 'target-user-1'

const membershipRow = {
  id: MEMBER_ID,
  workspaceId: WS_ID,
  userId: TARGET_USER_ID,
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

describe('setWorkspaceMemberSpecialty', () => {
  it('returns FORBIDDEN when caller is COLABORADOR', async () => {
    const result = await setWorkspaceMemberSpecialty(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeUserSpecialtyRepoMock(),
      makeSpecialtyRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns TARGET_MEMBER_NOT_FOUND when member missing', async () => {
    const result = await setWorkspaceMemberSpecialty(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
        findById: vi.fn().mockResolvedValue(null),
      }),
      makeUserSpecialtyRepoMock(),
      makeSpecialtyRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'TARGET_MEMBER_NOT_FOUND' })
  })

  it('returns SPECIALTY_NOT_IN_WORKSPACE when specialty unavailable', async () => {
    const result = await setWorkspaceMemberSpecialty(
      adminCoordRepo(),
      makeUserSpecialtyRepoMock(),
      makeSpecialtyRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({
      success: false,
      code: 'SPECIALTY_NOT_IN_WORKSPACE',
    })
  })

  it('creates new UserSpecialty + audit when none active', async () => {
    const newRow = {
      id: 'us-new',
      userId: TARGET_USER_ID,
      workspaceId: WS_ID,
      specialtyId: SP_ID,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const userSpecRepo = makeUserSpecialtyRepoMock({
      findActiveByMember: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(newRow),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await setWorkspaceMemberSpecialty(
      adminCoordRepo(),
      userSpecRepo,
      makeSpecialtyRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: SP_ID }),
      }),
      auditRepo,
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, specialtyId: SP_ID },
    )
    expect(result.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_MEMBER_SPECIALTY_SET',
      }),
      expect.any(Object),
    )
  })

  it('soft-deletes old + creates new when reassigning', async () => {
    const oldRow = {
      id: 'us-old',
      userId: TARGET_USER_ID,
      workspaceId: WS_ID,
      specialtyId: 'sp-old',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const userSpecRepo = makeUserSpecialtyRepoMock({
      findActiveByMember: vi.fn().mockResolvedValue(oldRow),
      create: vi
        .fn()
        .mockResolvedValue({ ...oldRow, id: 'us-new', specialtyId: SP_ID }),
    })

    await setWorkspaceMemberSpecialty(
      adminCoordRepo(),
      userSpecRepo,
      makeSpecialtyRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: SP_ID }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, specialtyId: SP_ID },
    )
    expect(userSpecRepo.softDelete).toHaveBeenCalledWith(
      'us-old',
      expect.any(Object),
    )
    expect(userSpecRepo.create).toHaveBeenCalled()
  })

  it('no-op when same specialty already assigned (no soft-delete, no create)', async () => {
    const existing = {
      id: 'us-existing',
      userId: TARGET_USER_ID,
      workspaceId: WS_ID,
      specialtyId: SP_ID,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const userSpecRepo = makeUserSpecialtyRepoMock({
      findActiveByMember: vi.fn().mockResolvedValue(existing),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await setWorkspaceMemberSpecialty(
      adminCoordRepo(),
      userSpecRepo,
      makeSpecialtyRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: SP_ID }),
      }),
      auditRepo,
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID, specialtyId: SP_ID },
    )
    expect(result.success).toBe(true)
    expect(userSpecRepo.softDelete).not.toHaveBeenCalled()
    expect(userSpecRepo.create).not.toHaveBeenCalled()
    expect(auditRepo.log).not.toHaveBeenCalled()
  })
})
