import { describe, expect, it, vi } from 'vitest'

import { createWorkspaceSpecialty } from '../create-workspace-specialty.use-case'
import {
  makeAuditRepoMock,
  makeSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

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
    workspace: {
      findFirst: vi.fn().mockResolvedValue({
        timezone: 'America/Sao_Paulo',
        tenant: {
          id: 'tenant-1',
          plan: 'CORPORATE',
          gracePeriodUntil: null,
          timezone: 'America/Sao_Paulo',
        },
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    workspaceMembership: { count: vi.fn().mockResolvedValue(0) },
    category: { count: vi.fn().mockResolvedValue(0) },
    specialty: { count: vi.fn().mockResolvedValue(0) },
    schedule: { count: vi.fn().mockResolvedValue(0) },
    shift: { count: vi.fn().mockResolvedValue(0) },
    request: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi
        .fn()
        .mockResolvedValue({ _sum: { attachmentSizeBytes: null } }),
    },
  },
}))

const principal = { userId: 'user-1', role: 'USER' }
const WS_ID = 'ws-1'

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

function adminMembershipRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
  })
}

describe('createWorkspaceSpecialty', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await createWorkspaceSpecialty(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeSpecialtyRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, slug: 'x', name: 'X' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await createWorkspaceSpecialty(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeSpecialtyRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, slug: 'x', name: 'X' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when workspace is soft-deleted', async () => {
    const result = await createWorkspaceSpecialty(
      makeWorkspaceRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      adminMembershipRepo(),
      makeSpecialtyRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, slug: 'x', name: 'X' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns ALREADY_EXISTS on Prisma P2002', async () => {
    const result = await createWorkspaceSpecialty(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      adminMembershipRepo(),
      makeSpecialtyRepoMock({
        create: vi.fn().mockRejectedValue({ code: 'P2002' }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, slug: 'nurse_tech', name: 'Técnico(a)' },
    )
    expect(result).toEqual({ success: false, code: 'ALREADY_EXISTS' })
  })

  it('creates specialty and writes audit on happy path', async () => {
    const row = {
      id: 'sp-1',
      scope: 'WORKSPACE',
      vertical: null,
      tenantId: 't-1',
      workspaceId: WS_ID,
      slug: 'custom',
      name: 'Custom',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const specialtyRepo = makeSpecialtyRepoMock({
      create: vi.fn().mockResolvedValue(row),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await createWorkspaceSpecialty(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      adminMembershipRepo(),
      specialtyRepo,
      auditRepo,
      principal,
      { workspaceId: WS_ID, slug: 'custom', name: 'Custom' },
    )
    expect(result.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_SPECIALTY_CREATED',
        entityId: 'sp-1',
      }),
      expect.any(Object),
    )
  })
})
