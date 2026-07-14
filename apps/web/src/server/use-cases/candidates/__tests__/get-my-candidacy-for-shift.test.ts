import { describe, expect, it, vi } from 'vitest'

import { getMyCandidacyForShift } from '../get-my-candidacy-for-shift.use-case'
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
  assignmentMode: 'OPEN_FOR_APPLY' as const,
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

describe('getMyCandidacyForShift', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await getMyCandidacyForShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeCandidateRepoMock(),
      null,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns null candidacy + count for non-applicant (RQ3 Ideal)', async () => {
    const r = await getMyCandidacyForShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock({
        findActiveByShiftAndUser: vi.fn().mockResolvedValue(null),
        countByShift: vi.fn().mockResolvedValue(5),
      }),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.candidateId).toBeNull()
      expect(r.data.position).toBeNull()
      expect(r.data.status).toBeNull()
      expect(r.data.count).toBe(5)
    }
  })

  it('returns position + status for applicant', async () => {
    const r = await getMyCandidacyForShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock({
        findActiveByShiftAndUser: vi.fn().mockResolvedValue({
          id: 'c-1',
          queuePosition: 3,
          status: 'QUEUED',
        }),
        countByShift: vi.fn().mockResolvedValue(5),
      }),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.candidateId).toBe('c-1')
      expect(r.data.position).toBe(3)
      expect(r.data.status).toBe('QUEUED')
      expect(r.data.count).toBe(5)
    }
  })

  it('NOT_FOUND when shift missing', async () => {
    const r = await getMyCandidacyForShift(
      memberAuth,
      makeScheduleRepoMock(),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeCandidateRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })
})
