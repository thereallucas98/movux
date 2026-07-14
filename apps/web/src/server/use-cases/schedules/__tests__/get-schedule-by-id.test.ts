import { describe, expect, it, vi } from 'vitest'

import { getScheduleById } from '../get-schedule-by-id.use-case'
import {
  makeScheduleRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

const scheduleRow = {
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date(),
  periodEnd: new Date(),
  status: 'DRAFT' as const,
  publishedAt: null,
  closedAt: null,
  deletedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('getScheduleById', () => {
  it('returns NOT_FOUND when schedule missing', async () => {
    const result = await getScheduleById(
      makeScheduleRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeWorkspaceMembershipRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns FORBIDDEN when caller is non-member of schedule workspace', async () => {
    const result = await getScheduleById(
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(scheduleRow),
      }),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns schedule on happy path', async () => {
    const result = await getScheduleById(
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(scheduleRow),
      }),
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe('sch-1')
  })
})
