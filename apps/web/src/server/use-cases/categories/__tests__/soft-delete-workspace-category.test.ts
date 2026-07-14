import { describe, expect, it, vi } from 'vitest'

import { softDeleteWorkspaceCategory } from '../soft-delete-workspace-category.use-case'
import {
  makeAuditRepoMock,
  makeCategoryRepoMock,
  makeWorkspaceMembershipRepoMock,
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
const CAT_ID = 'cat-1'

function adminMembershipRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
  })
}

const wsScopedCategory = {
  id: CAT_ID,
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

describe('softDeleteWorkspaceCategory', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await softDeleteWorkspaceCategory(
      makeWorkspaceMembershipRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, categoryId: CAT_ID },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await softDeleteWorkspaceCategory(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, categoryId: CAT_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when category is not WORKSPACE-scope', async () => {
    const result = await softDeleteWorkspaceCategory(
      adminMembershipRepo(),
      makeCategoryRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedCategory, scope: 'GLOBAL' }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, categoryId: CAT_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns CANNOT_DELETE_GERAL when target is the general category', async () => {
    const result = await softDeleteWorkspaceCategory(
      adminMembershipRepo(),
      makeCategoryRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedCategory, slug: 'general' }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, categoryId: CAT_ID },
    )
    expect(result).toEqual({ success: false, code: 'CANNOT_DELETE_GERAL' })
  })

  it('soft-deletes category and writes audit on happy path', async () => {
    const categoryRepo = makeCategoryRepoMock({
      findById: vi.fn().mockResolvedValue(wsScopedCategory),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await softDeleteWorkspaceCategory(
      adminMembershipRepo(),
      categoryRepo,
      auditRepo,
      principal,
      { workspaceId: WS_ID, categoryId: CAT_ID },
    )

    expect(result).toEqual({ success: true })
    expect(categoryRepo.softDelete).toHaveBeenCalledWith(
      CAT_ID,
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_CATEGORY_DELETED',
        entityId: CAT_ID,
      }),
      expect.any(Object),
    )
  })
})
