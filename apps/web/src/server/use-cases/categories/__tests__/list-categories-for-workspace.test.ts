import { describe, expect, it, vi } from 'vitest'

import { listCategoriesForWorkspace } from '../list-categories-for-workspace.use-case'
import {
  makeCategoryRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

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

function activeMembershipRepo(role = 'COLABORADOR') {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role, isActive: true }),
  })
}

describe('listCategoriesForWorkspace', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await listCategoriesForWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeCategoryRepoMock(),
      null,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not an active member', async () => {
    const result = await listCategoriesForWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeCategoryRepoMock(),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when workspace is soft-deleted', async () => {
    const result = await listCategoriesForWorkspace(
      makeWorkspaceRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      activeMembershipRepo(),
      makeCategoryRepoMock({
        listGlobal: vi.fn().mockResolvedValue([]),
        listTenant: vi.fn().mockResolvedValue([]),
        listWorkspace: vi.fn().mockResolvedValue([]),
      }),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns empty sorted list when no categories exist', async () => {
    const result = await listCategoriesForWorkspace(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      activeMembershipRepo(),
      makeCategoryRepoMock({
        listGlobal: vi.fn().mockResolvedValue([]),
        listTenant: vi.fn().mockResolvedValue([]),
        listWorkspace: vi.fn().mockResolvedValue([]),
      }),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([])
  })

  it('merges with override order WORKSPACE > TENANT > GLOBAL by slug', async () => {
    const baseRow = {
      id: '',
      scope: '',
      vertical: null,
      tenantId: null,
      workspaceId: null,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await listCategoriesForWorkspace(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      activeMembershipRepo('ADMIN'),
      makeCategoryRepoMock({
        listGlobal: vi.fn().mockResolvedValue([
          {
            ...baseRow,
            id: 'g1',
            scope: 'GLOBAL',
            vertical: 'HOSPITAL',
            slug: 'icu',
            name: 'UTI GLOBAL',
          },
          {
            ...baseRow,
            id: 'g2',
            scope: 'GLOBAL',
            vertical: 'HOSPITAL',
            slug: 'nursing',
            name: 'Enfermagem',
          },
        ]),
        listTenant: vi.fn().mockResolvedValue([
          {
            ...baseRow,
            id: 't1',
            scope: 'TENANT',
            tenantId: 't-1',
            slug: 'icu',
            name: 'UTI TENANT',
          },
        ]),
        listWorkspace: vi.fn().mockResolvedValue([
          {
            ...baseRow,
            id: 'w1',
            scope: 'WORKSPACE',
            tenantId: 't-1',
            workspaceId: WS_ID,
            slug: 'icu',
            name: 'UTI CUSTOM',
          },
        ]),
      }),
      principal,
      { workspaceId: WS_ID },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      const icu = result.data.find((c) => c.slug === 'icu')
      expect(icu?.source).toBe('WORKSPACE')
      expect(icu?.name).toBe('UTI CUSTOM')
      const nursing = result.data.find((c) => c.slug === 'nursing')
      expect(nursing?.source).toBe('GLOBAL')
      expect(result.data).toHaveLength(2)
    }
  })
})
