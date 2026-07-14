import { describe, expect, it, vi } from 'vitest'

import { addWorkspaceMember } from '../add-workspace-member.use-case'
import {
  makeAuditRepoMock,
  makeSpecialtyRepoMock,
  makeUserRepoMock,
  makeUserSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

const SPEC_ID = 'spec-1'

function specRepoOk() {
  return makeSpecialtyRepoMock({
    findAvailableForWorkspace: vi.fn().mockResolvedValue({
      id: SPEC_ID,
      slug: 'doctor',
      name: 'Médico(a)',
      scope: 'GLOBAL',
    }),
  })
}

function userSpecRepoOk() {
  return makeUserSpecialtyRepoMock({
    findActiveByMember: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: 'us-1',
      userId: 'u',
      workspaceId: 'w',
      specialtyId: SPEC_ID,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  })
}

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
    tenant: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'tenant-1',
        plan: 'CORPORATE',
        gracePeriodUntil: null,
        timezone: 'America/Sao_Paulo',
      }),
    },
    workspaceMembership: { count: vi.fn().mockResolvedValue(0) },
  },
}))

const principal = { userId: 'user-1', role: 'USER' }
const WS_ID = 'ws-1'
const TARGET_EMAIL = 'target@movux.test'
const TARGET_ID = 'user-target'

const workspaceRow = {
  id: WS_ID,
  tenantId: 't-1',
  name: 'WS',
  timezone: 'UTC',
  vertical: 'HOSPITAL',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function adminMembershipRepo(
  overrides: Partial<ReturnType<typeof makeWorkspaceMembershipRepoMock>> = {},
) {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
    ...overrides,
  })
}

describe('addWorkspaceMember', () => {
  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await addWorkspaceMember(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeUserRepoMock(),
      makeAuditRepoMock(),

      specRepoOk(),

      userSpecRepoOk(),
      principal,
      {
        workspaceId: WS_ID,
        email: TARGET_EMAIL,
        role: 'COLABORADOR',
        specialtyId: SPEC_ID,
      },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when workspace is soft-deleted', async () => {
    const result = await addWorkspaceMember(
      makeWorkspaceRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      adminMembershipRepo(),
      makeUserRepoMock(),
      makeAuditRepoMock(),

      specRepoOk(),

      userSpecRepoOk(),
      principal,
      {
        workspaceId: WS_ID,
        email: TARGET_EMAIL,
        role: 'COLABORADOR',
        specialtyId: SPEC_ID,
      },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns TARGET_USER_NOT_FOUND when email has no active user', async () => {
    const result = await addWorkspaceMember(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      adminMembershipRepo(),
      makeUserRepoMock({
        findActiveByEmail: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),

      specRepoOk(),

      userSpecRepoOk(),
      principal,
      {
        workspaceId: WS_ID,
        email: TARGET_EMAIL,
        role: 'COLABORADOR',
        specialtyId: SPEC_ID,
      },
    )
    expect(result).toEqual({ success: false, code: 'TARGET_USER_NOT_FOUND' })
  })

  it('reactivates a soft-deleted membership with the new role', async () => {
    const membershipRepo = adminMembershipRepo({
      findAny: vi.fn().mockResolvedValue({
        id: 'mem-old',
        workspaceId: WS_ID,
        userId: TARGET_ID,
        role: 'COLABORADOR',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      reactivate: vi.fn().mockResolvedValue({
        id: 'mem-old',
        workspaceId: WS_ID,
        userId: TARGET_ID,
        role: 'COORDENADOR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })

    const result = await addWorkspaceMember(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      membershipRepo,
      makeUserRepoMock({
        findActiveByEmail: vi.fn().mockResolvedValue({ id: TARGET_ID }),
      }),
      makeAuditRepoMock(),

      specRepoOk(),

      userSpecRepoOk(),
      principal,
      {
        workspaceId: WS_ID,
        email: TARGET_EMAIL,
        role: 'COORDENADOR',
        specialtyId: SPEC_ID,
      },
    )

    expect(result.success).toBe(true)
    expect(membershipRepo.reactivate).toHaveBeenCalledWith(
      'mem-old',
      'COORDENADOR',
      expect.any(Object),
    )
    expect(membershipRepo.create).not.toHaveBeenCalled()
  })

  it('creates a new membership and writes audit on happy path', async () => {
    const newMembership = {
      id: 'mem-new',
      workspaceId: WS_ID,
      userId: TARGET_ID,
      role: 'COLABORADOR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const membershipRepo = adminMembershipRepo({
      findAny: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(newMembership),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await addWorkspaceMember(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      membershipRepo,
      makeUserRepoMock({
        findActiveByEmail: vi.fn().mockResolvedValue({ id: TARGET_ID }),
      }),
      auditRepo,
      specRepoOk(),
      userSpecRepoOk(),
      principal,
      {
        workspaceId: WS_ID,
        email: TARGET_EMAIL,
        role: 'COLABORADOR',
        specialtyId: SPEC_ID,
      },
    )

    expect(result.success).toBe(true)
    expect(membershipRepo.create).toHaveBeenCalled()
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_MEMBER_ADDED',
        entityId: 'mem-new',
      }),
      expect.any(Object),
    )
  })

  it('returns ALREADY_MEMBER when existing active membership is found', async () => {
    const membershipRepo = adminMembershipRepo({
      findAny: vi.fn().mockResolvedValue({
        id: 'mem-active',
        workspaceId: WS_ID,
        userId: TARGET_ID,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })

    const result = await addWorkspaceMember(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      membershipRepo,
      makeUserRepoMock({
        findActiveByEmail: vi.fn().mockResolvedValue({ id: TARGET_ID }),
      }),
      makeAuditRepoMock(),

      specRepoOk(),

      userSpecRepoOk(),
      principal,
      {
        workspaceId: WS_ID,
        email: TARGET_EMAIL,
        role: 'ADMIN',
        specialtyId: SPEC_ID,
      },
    )

    expect(result).toEqual({ success: false, code: 'ALREADY_MEMBER' })
  })
})
