import { describe, expect, it, vi } from 'vitest'

import { createWorkspaceCategory } from '../create-workspace-category.use-case'
import {
  makeAuditRepoMock,
  makeCategoryRepoMock,
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

describe('createWorkspaceCategory', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await createWorkspaceCategory(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, slug: 'x', name: 'X' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await createWorkspaceCategory(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, slug: 'x', name: 'X' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when workspace is soft-deleted', async () => {
    const result = await createWorkspaceCategory(
      makeWorkspaceRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      adminMembershipRepo(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, slug: 'x', name: 'X' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns ALREADY_EXISTS on Prisma P2002', async () => {
    const categoryRepo = makeCategoryRepoMock({
      create: vi.fn().mockRejectedValue({ code: 'P2002' }),
    })
    const result = await createWorkspaceCategory(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      adminMembershipRepo(),
      categoryRepo,
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, slug: 'icu', name: 'Custom UTI' },
    )
    expect(result).toEqual({ success: false, code: 'ALREADY_EXISTS' })
  })

  it('creates category and writes audit on happy path', async () => {
    const newCategory = {
      id: 'cat-1',
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
    const categoryRepo = makeCategoryRepoMock({
      create: vi.fn().mockResolvedValue(newCategory),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await createWorkspaceCategory(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      adminMembershipRepo(),
      categoryRepo,
      auditRepo,
      principal,
      { workspaceId: WS_ID, slug: 'custom', name: 'Custom' },
    )

    expect(result.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_CATEGORY_CREATED',
        entityId: 'cat-1',
      }),
      expect.any(Object),
    )
  })
})
