import { describe, expect, it, vi } from 'vitest'

import { closeAssignment } from '../close-assignment.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeTimeEntryRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'u-coord', role: 'USER' }
const NOW_ANCHOR = new Date()

const pendingClosure = {
  id: 'asg-1',
  shiftId: 'shift-1',
  userId: 'u-1',
  assignedByUserId: 'u-coord',
  status: 'PENDING_CLOSURE' as const,
  decisionDeadline: NOW_ANCHOR,
  decidedAt: NOW_ANCHOR,
  rejectionReason: null,
  createdAt: NOW_ANCHOR,
  updatedAt: NOW_ANCHOR,
  shift: {
    id: 'shift-1',
    scheduleId: 'sch-1',
    categoryId: 'cat-1',
    startAt: new Date(NOW_ANCHOR.getTime() - 8 * 60 * 60_000),
    endAt: new Date(NOW_ANCHOR.getTime() - 60_000),
    headcount: 1,
    status: 'OPEN',
    assignmentMode: 'DIRECT_ASSIGN',
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

const completedTimeEntry = {
  id: 'te-1',
  shiftAssignmentId: 'asg-1',
  userId: 'u-1',
  clockInAt: new Date(NOW_ANCHOR.getTime() - 8 * 60 * 60_000),
  clockInLocation: null,
  clockInWithinTolerance: true,
  clockOutAt: NOW_ANCHOR,
  clockOutLocation: null,
  clockOutWithinTolerance: true,
  overtimeMinutes: 0,
  closedByUserId: null,
  closedAt: null,
  notes: null,
  createdAt: NOW_ANCHOR,
  updatedAt: NOW_ANCHOR,
}

const coordAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COORDENADOR', isActive: true }),
})

describe('closeAssignment', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await closeAssignment(
      coordAuth,
      makeAssignmentRepoMock(),
      makeTimeEntryRepoMock(),
      makeAuditRepoMock(),
      null,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when assignment is missing', async () => {
    const r = await closeAssignment(
      coordAuth,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(null),
      }),
      makeTimeEntryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is COLABORADOR', async () => {
    const r = await closeAssignment(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(pendingClosure),
      }),
      makeTimeEntryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when status is ACCEPTED (not pending closure)', async () => {
    const r = await closeAssignment(
      coordAuth,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...pendingClosure, status: 'ACCEPTED' }),
      }),
      makeTimeEntryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('INVALID_STATE_TRANSITION when time entry has no clock-out', async () => {
    const r = await closeAssignment(
      coordAuth,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(pendingClosure),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi
          .fn()
          .mockResolvedValue({ ...completedTimeEntry, clockOutAt: null }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy path flips assignment to COMPLETED + sets closedAt + closedByUserId', async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ ...completedTimeEntry, closedByUserId: 'u-coord' })
    const updateAssignment = vi.fn().mockResolvedValue({})
    const r = await closeAssignment(
      coordAuth,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(pendingClosure),
        update: updateAssignment,
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue(completedTimeEntry),
        update,
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1', notes: 'turno ok' },
    )
    expect(r.success).toBe(true)
    expect(update).toHaveBeenCalledWith(
      'te-1',
      expect.objectContaining({
        closedByUserId: 'u-coord',
        notes: 'turno ok',
      }),
      expect.anything(),
    )
    expect(updateAssignment).toHaveBeenCalledWith(
      'asg-1',
      { status: 'COMPLETED' },
      expect.anything(),
    )
  })
})
