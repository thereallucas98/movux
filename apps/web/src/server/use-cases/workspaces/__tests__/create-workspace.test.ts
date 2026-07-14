import { describe, expect, it, vi } from 'vitest'

import { createWorkspace } from '../create-workspace.use-case'
import {
  makeAuditRepoMock,
  makeCategoryRepoMock,
  makeMembershipRepoMock,
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
    workspace: { count: vi.fn().mockResolvedValue(0) },
  },
}))

const principal = { userId: 'user-1', role: 'USER' }
const TENANT_ID = 'tenant-1'

describe('createWorkspace', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await createWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeMembershipRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      null,
      { tenantId: TENANT_ID, name: 'WS', vertical: 'HOSPITAL' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not SUPER_ADMIN of the tenant', async () => {
    const result = await createWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeMembershipRepoMock({ findActive: vi.fn().mockResolvedValue(null) }),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { tenantId: TENANT_ID, name: 'WS', vertical: 'HOSPITAL' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('creates workspace + ADMIN membership + Geral + audit in a transaction', async () => {
    const workspace = {
      id: 'ws-1',
      tenantId: TENANT_ID,
      name: 'Hospital Central',
      timezone: 'America/Sao_Paulo',
      vertical: 'HOSPITAL',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const membership = {
      id: 'mem-1',
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const geralCategory = {
      id: 'cat-geral',
      scope: 'WORKSPACE',
      vertical: null,
      tenantId: TENANT_ID,
      workspaceId: 'ws-1',
      slug: 'general',
      name: 'Geral',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const workspaceRepo = makeWorkspaceRepoMock({
      create: vi.fn().mockResolvedValue(workspace),
    })
    const workspaceMembershipRepo = makeWorkspaceMembershipRepoMock({
      create: vi.fn().mockResolvedValue(membership),
    })
    const tenantMembershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const categoryRepo = makeCategoryRepoMock({
      create: vi.fn().mockResolvedValue(geralCategory),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await createWorkspace(
      workspaceRepo,
      workspaceMembershipRepo,
      tenantMembershipRepo,
      categoryRepo,
      auditRepo,
      principal,
      { tenantId: TENANT_ID, name: 'Hospital Central', vertical: 'HOSPITAL' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.workspace).toEqual(workspace)
      expect(result.data.membership).toEqual(membership)
    }
    expect(workspaceRepo.create).toHaveBeenCalled()
    expect(workspaceMembershipRepo.create).toHaveBeenCalled()
    expect(categoryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'WORKSPACE',
        tenantId: TENANT_ID,
        workspaceId: 'ws-1',
        slug: 'general',
        name: 'Geral',
      }),
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_CREATED',
        entityType: 'WORKSPACE',
        entityId: 'ws-1',
        metadata: expect.objectContaining({
          geralCategoryId: 'cat-geral',
        }),
      }),
      expect.any(Object),
    )
  })

  it('passes optional timezone through', async () => {
    const workspaceRepo = makeWorkspaceRepoMock({
      create: vi.fn().mockResolvedValue({
        id: 'ws-2',
        tenantId: TENANT_ID,
        name: 'Gym',
        timezone: 'America/New_York',
        vertical: 'GYM',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const workspaceMembershipRepo = makeWorkspaceMembershipRepoMock({
      create: vi.fn().mockResolvedValue({
        id: 'm',
        workspaceId: 'ws-2',
        userId: 'user-1',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const tenantMembershipRepo = makeMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
    })
    const categoryRepo = makeCategoryRepoMock({
      create: vi.fn().mockResolvedValue({
        id: 'cat-g',
        scope: 'WORKSPACE',
        slug: 'general',
      }),
    })

    await createWorkspace(
      workspaceRepo,
      workspaceMembershipRepo,
      tenantMembershipRepo,
      categoryRepo,
      makeAuditRepoMock(),
      principal,
      {
        tenantId: TENANT_ID,
        name: 'Gym',
        vertical: 'GYM',
        timezone: 'America/New_York',
      },
    )

    expect(workspaceRepo.create).toHaveBeenCalledWith(
      {
        tenantId: TENANT_ID,
        name: 'Gym',
        vertical: 'GYM',
        timezone: 'America/New_York',
      },
      expect.any(Object),
    )
  })
})
