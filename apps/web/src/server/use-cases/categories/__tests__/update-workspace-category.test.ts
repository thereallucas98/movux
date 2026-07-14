import { describe, expect, it, vi } from 'vitest'

import { updateWorkspaceCategory } from '../update-workspace-category.use-case'
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

describe('updateWorkspaceCategory', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await updateWorkspaceCategory(
      makeWorkspaceMembershipRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, categoryId: CAT_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await updateWorkspaceCategory(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, categoryId: CAT_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when category is not WORKSPACE-scope', async () => {
    const result = await updateWorkspaceCategory(
      adminMembershipRepo(),
      makeCategoryRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedCategory, scope: 'GLOBAL' }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, categoryId: CAT_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns NOT_FOUND when category belongs to a different workspace', async () => {
    const result = await updateWorkspaceCategory(
      adminMembershipRepo(),
      makeCategoryRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedCategory, workspaceId: 'other-ws' }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, categoryId: CAT_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('updates category and writes audit on happy path', async () => {
    const updated = { ...wsScopedCategory, name: 'Renamed' }
    const categoryRepo = makeCategoryRepoMock({
      findById: vi.fn().mockResolvedValue(wsScopedCategory),
      update: vi.fn().mockResolvedValue(updated),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await updateWorkspaceCategory(
      adminMembershipRepo(),
      categoryRepo,
      auditRepo,
      principal,
      {
        workspaceId: WS_ID,
        categoryId: CAT_ID,
        data: { name: 'Renamed' },
      },
    )

    expect(result.success).toBe(true)
    expect(categoryRepo.update).toHaveBeenCalledWith(
      CAT_ID,
      { name: 'Renamed' },
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_CATEGORY_UPDATED',
        entityId: CAT_ID,
      }),
      expect.any(Object),
    )
  })
})
