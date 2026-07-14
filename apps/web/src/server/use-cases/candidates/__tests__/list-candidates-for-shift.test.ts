import { describe, expect, it, vi } from 'vitest'

import { listCandidatesForShift } from '../list-candidates-for-shift.use-case'
import {
  makeCandidateRepoMock,
  makeScheduleRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const adminPrincipal = { userId: 'admin-1', role: 'USER' }

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

describe('listCandidatesForShift', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await listCandidatesForShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeCandidateRepoMock(),
      null,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN for COLABORADOR', async () => {
    const r = await listCandidatesForShift(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock(),
      adminPrincipal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('happy: returns sorted candidates', async () => {
    const candidates = [
      { id: 'c-1', queuePosition: 1, status: 'QUEUED' as const },
      { id: 'c-2', queuePosition: 2, status: 'QUEUED' as const },
    ]
    const r = await listCandidatesForShift(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock({
        listForShift: vi.fn().mockResolvedValue(candidates),
      }),
      adminPrincipal,
      { shiftId: 'shift-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toHaveLength(2)
  })
})
