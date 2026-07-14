import { describe, expect, it, vi } from 'vitest'

import { getCategoryBreakdown } from '../get-category-breakdown.use-case'
import {
  makeAssignmentRepoMock,
  makeCategoryRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'u', role: 'COLABORADOR' }
const baseInput = {
  workspaceId: 'ws-1',
  fromAt: new Date('2026-04-28T03:00:00Z'),
  toAt: new Date('2026-05-06T02:59:59Z'),
}

function categoryRow(id: string, name: string) {
  return {
    id,
    scope: 'WORKSPACE' as const,
    vertical: null,
    tenantId: null,
    workspaceId: 'ws-1',
    slug: name.toLowerCase(),
    name,
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const memberships = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
})

const workspaceRepo = makeWorkspaceRepoMock({
  findById: vi.fn().mockResolvedValue({
    id: 'ws-1',
    tenantId: 'tenant-1',
    name: 'WS',
    timezone: 'America/Sao_Paulo',
    vertical: 'HOSPITAL',
    clockToleranceMinutes: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
})

describe('getCategoryBreakdown', () => {
  it('returns FORBIDDEN when caller is not active', async () => {
    const result = await getCategoryBreakdown(
      workspaceRepo,
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeCategoryRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      principal,
      baseInput,
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('sorts by shift count desc and slices top 5', async () => {
    const cats = [
      categoryRow('a', 'A'),
      categoryRow('b', 'B'),
      categoryRow('c', 'C'),
      categoryRow('d', 'D'),
      categoryRow('e', 'E'),
      categoryRow('f', 'F'),
    ]
    const categoryRepo = makeCategoryRepoMock({
      listGlobal: vi.fn().mockResolvedValue([]),
      listTenant: vi.fn().mockResolvedValue([]),
      listWorkspace: vi.fn().mockResolvedValue(cats),
    })
    const shiftRepo = makeShiftRepoMock({
      countByCategoryForWeek: vi.fn().mockResolvedValue([
        { categoryId: 'a', count: 1, totalHeadcount: 1 },
        { categoryId: 'b', count: 5, totalHeadcount: 10 },
        { categoryId: 'c', count: 3, totalHeadcount: 6 },
        { categoryId: 'd', count: 7, totalHeadcount: 14 },
        { categoryId: 'e', count: 2, totalHeadcount: 4 },
        { categoryId: 'f', count: 4, totalHeadcount: 8 },
      ]),
      listUpcomingForWorkspace: vi.fn().mockResolvedValue([]),
    })
    const result = await getCategoryBreakdown(
      workspaceRepo,
      memberships,
      categoryRepo,
      shiftRepo,
      makeAssignmentRepoMock(),
      principal,
      baseInput,
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.map((r) => r.categoryId)).toEqual([
      'd',
      'b',
      'f',
      'c',
      'e',
    ])
    expect(result.data).toHaveLength(5)
  })

  it('defaults unused categories to count=0', async () => {
    const categoryRepo = makeCategoryRepoMock({
      listGlobal: vi.fn().mockResolvedValue([]),
      listTenant: vi.fn().mockResolvedValue([]),
      listWorkspace: vi
        .fn()
        .mockResolvedValue([categoryRow('a', 'A'), categoryRow('b', 'B')]),
    })
    const shiftRepo = makeShiftRepoMock({
      countByCategoryForWeek: vi
        .fn()
        .mockResolvedValue([{ categoryId: 'a', count: 3, totalHeadcount: 6 }]),
      listUpcomingForWorkspace: vi.fn().mockResolvedValue([]),
    })
    const result = await getCategoryBreakdown(
      workspaceRepo,
      memberships,
      categoryRepo,
      shiftRepo,
      makeAssignmentRepoMock(),
      principal,
      baseInput,
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    const b = result.data.find((r) => r.categoryId === 'b')
    expect(b).toMatchObject({ shiftCount: 0, filled: 0, total: 0 })
  })
})
