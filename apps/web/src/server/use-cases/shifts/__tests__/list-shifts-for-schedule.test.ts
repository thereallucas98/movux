import { describe, expect, it, vi } from 'vitest'

import { listShiftsForSchedule } from '../list-shifts-for-schedule.use-case'
import {
  makeScheduleRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

const draftSchedule = {
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date('2026-07-01'),
  periodEnd: new Date('2026-08-01'),
  status: 'DRAFT' as const,
  publishedAt: null,
  closedAt: null,
  deletedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('listShiftsForSchedule', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await listShiftsForSchedule(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      null,
      { scheduleId: 'sch-1', filter: {}, limit: 20 },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns NOT_FOUND when schedule missing', async () => {
    const result = await listShiftsForSchedule(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeShiftRepoMock(),
      principal,
      { scheduleId: 'sch-1', filter: {}, limit: 20 },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns FORBIDDEN when not member of workspace', async () => {
    const result = await listShiftsForSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock(),
      principal,
      { scheduleId: 'sch-1', filter: {}, limit: 20 },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('passes filter through to repo on happy path', async () => {
    const listMock = vi.fn().mockResolvedValue({ data: [], nextCursor: null })
    const result = await listShiftsForSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({ listForSchedule: listMock }),
      principal,
      {
        scheduleId: 'sch-1',
        filter: { status: 'OPEN', categoryId: 'cat-1' },
        limit: 50,
      },
    )
    expect(result.success).toBe(true)
    expect(listMock).toHaveBeenCalledWith(
      'sch-1',
      { status: 'OPEN', categoryId: 'cat-1' },
      undefined,
      50,
    )
  })
})
