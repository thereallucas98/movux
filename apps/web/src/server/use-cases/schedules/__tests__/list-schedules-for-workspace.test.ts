import { describe, expect, it, vi } from 'vitest'

import { listSchedulesForWorkspace } from '../list-schedules-for-workspace.use-case'
import {
  makeScheduleRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

describe('listSchedulesForWorkspace', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await listSchedulesForWorkspace(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      null,
      { workspaceId: 'ws-1' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when non-member', async () => {
    const result = await listSchedulesForWorkspace(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeScheduleRepoMock(),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns list with filters passed through', async () => {
    const scheduleRepo = makeScheduleRepoMock({
      listForWorkspace: vi
        .fn()
        .mockResolvedValue({ data: [{ id: 'sch-1' }], nextCursor: null }),
    })
    const result = await listSchedulesForWorkspace(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      scheduleRepo,
      principal,
      {
        workspaceId: 'ws-1',
        filter: { status: 'PUBLISHED', categoryId: 'cat-1' },
        limit: 10,
      },
    )
    expect(result.success).toBe(true)
    expect(scheduleRepo.listForWorkspace).toHaveBeenCalledWith(
      'ws-1',
      { status: 'PUBLISHED', categoryId: 'cat-1' },
      null,
      10,
    )
  })
})
