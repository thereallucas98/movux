import { describe, expect, it, vi } from 'vitest'

import { getAssignmentById } from '../get-assignment-by-id.use-case'
import {
  makeAssignmentRepoMock,
  makeShiftCompositionRepoMock,
  makeUserSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'u-x', role: 'USER' }

const assignmentWithShift = {
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
  shift: {
    id: 'shift-1',
    scheduleId: 'sch-1',
    startAt: new Date(),
    endAt: new Date(),
    headcount: 1,
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

describe('getAssignmentById', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const r = await getAssignmentById(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      null,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns NOT_FOUND when assignment missing', async () => {
    const r = await getAssignmentById(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(null),
      }),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('happy: returns assignment with compositionStatus', async () => {
    const r = await getAssignmentById(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(assignmentWithShift),
      }),
      makeUserSpecialtyRepoMock({
        findActiveByMember: vi.fn().mockResolvedValue(null),
      }),
      makeShiftCompositionRepoMock({
        findByShift: vi.fn().mockResolvedValue([]),
      }),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.id).toBe('a-1')
      expect(r.data.compositionStatus).toBe('UNKNOWN')
    }
  })
})
