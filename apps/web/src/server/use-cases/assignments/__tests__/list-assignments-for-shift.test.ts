import { describe, expect, it, vi } from 'vitest'

import { listAssignmentsForShift } from '../list-assignments-for-shift.use-case'
import {
  makeAssignmentRepoMock,
  makeScheduleRepoMock,
  makeShiftCompositionRepoMock,
  makeShiftRepoMock,
  makeUserSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'u-x', role: 'USER' }

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
  headcount: 2,
  status: 'OPEN' as const,
  decisionWindowHours: 48,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('listAssignmentsForShift', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const r = await listAssignmentsForShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      null,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns NOT_FOUND when shift missing', async () => {
    const r = await listAssignmentsForShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeAssignmentRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns FORBIDDEN when caller not workspace member', async () => {
    const r = await listAssignmentsForShift(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeAssignmentRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('happy path: returns assignments with compositionStatus computed', async () => {
    const assignments = [
      {
        id: 'a-1',
        shiftId: 'shift-1',
        userId: 'u-1',
        assignedByUserId: 'admin-1',
        status: 'PENDING_ACCEPT' as const,
        decisionDeadline: new Date(),
        decidedAt: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    const r = await listAssignmentsForShift(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeAssignmentRepoMock({
        listForShift: vi.fn().mockResolvedValue(assignments),
      }),
      makeUserSpecialtyRepoMock({
        findActiveByMember: vi.fn().mockResolvedValue({ specialtyId: 'sp-1' }),
      }),
      makeShiftCompositionRepoMock({
        findByShift: vi.fn().mockResolvedValue([{ specialtyId: 'sp-1' }]),
      }),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toHaveLength(1)
      expect(r.data[0].compositionStatus).toBe('MATCH')
    }
  })
})
