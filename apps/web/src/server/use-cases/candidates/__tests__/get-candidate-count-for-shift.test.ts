import { describe, expect, it, vi } from 'vitest'

import { getCandidateCountForShift } from '../get-candidate-count-for-shift.use-case'
import {
  makeCandidateRepoMock,
  makeScheduleRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }

const publishedSchedule = {
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date(),
  periodEnd: new Date(),
  status: 'PUBLISHED' as const,
  publishedAt: new Date(),
  closedAt: null,
  deletedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseShift = {
  id: 'shift-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date(),
  endAt: new Date(),
  headcount: 1,
  status: 'OPEN' as const,
  assignmentMode: 'DIRECT_ASSIGN' as const,
  decisionWindowHours: 48,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const memberAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
})

describe('getCandidateCountForShift', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await getCandidateCountForShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeCandidateRepoMock(),
      null,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns 0 for DIRECT_ASSIGN shift (no candidates)', async () => {
    const r = await getCandidateCountForShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock({ countByShift: vi.fn().mockResolvedValue(0) }),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.count).toBe(0)
  })

  it('happy: returns count', async () => {
    const r = await getCandidateCountForShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock({ countByShift: vi.fn().mockResolvedValue(7) }),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.count).toBe(7)
  })
})
