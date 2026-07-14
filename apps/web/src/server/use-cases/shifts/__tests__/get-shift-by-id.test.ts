import { describe, expect, it, vi } from 'vitest'

import { getShiftById } from '../get-shift-by-id.use-case'
import {
  makeScheduleRepoMock,
  makeShiftCompositionRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }

const draftSchedule = {
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

const shift = {
  id: 'shift-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date('2026-07-13T08:00:00Z'),
  endAt: new Date('2026-07-13T17:00:00Z'),
  headcount: 1,
  status: 'OPEN' as const,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('getShiftById', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await getShiftById(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeShiftCompositionRepoMock(),
      null,
      { shiftId: 'shift-1' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns NOT_FOUND when shift missing', async () => {
    const result = await getShiftById(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeShiftCompositionRepoMock(),
      principal,
      { shiftId: 'missing' },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns shift with composition on happy path', async () => {
    const composition = [
      {
        id: 'c-1',
        shiftId: 'shift-1',
        specialtyId: 'sp-1',
        count: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    const result = await getShiftById(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(shift) }),
      makeShiftCompositionRepoMock({
        findByShift: vi.fn().mockResolvedValue(composition),
      }),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expectedComposition).toEqual(composition)
      expect(result.data.id).toBe('shift-1')
    }
  })
})
