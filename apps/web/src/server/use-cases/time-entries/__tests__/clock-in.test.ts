import { describe, expect, it, vi } from 'vitest'

import { clockInToShift } from '../clock-in.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeTimeEntryRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'u-1', role: 'USER' }
const NOW_ANCHOR = new Date()

const acceptedAssignment = {
  id: 'asg-1',
  shiftId: 'shift-1',
  userId: 'u-1',
  assignedByUserId: 'u-coord',
  status: 'ACCEPTED' as const,
  decisionDeadline: NOW_ANCHOR,
  decidedAt: NOW_ANCHOR,
  rejectionReason: null,
  createdAt: NOW_ANCHOR,
  updatedAt: NOW_ANCHOR,
  shift: {
    id: 'shift-1',
    scheduleId: 'sch-1',
    categoryId: 'cat-1',
    startAt: new Date(NOW_ANCHOR.getTime() - 5 * 60_000), // 5 min ago
    endAt: new Date(NOW_ANCHOR.getTime() + 8 * 60 * 60_000),
    headcount: 1,
    status: 'OPEN',
    assignmentMode: 'DIRECT_ASSIGN',
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

const workspace = {
  id: 'ws-1',
  tenantId: 't-1',
  name: 'WS',
  timezone: 'America/Sao_Paulo',
  vertical: 'HOSPITAL' as const,
  clockToleranceMinutes: 15,
  isActive: true,
  createdAt: NOW_ANCHOR,
  updatedAt: NOW_ANCHOR,
}

const memberAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
})

describe('clockInToShift', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await clockInToShift(
      memberAuth,
      makeWorkspaceRepoMock(),
      makeAssignmentRepoMock(),
      makeTimeEntryRepoMock(),
      makeAuditRepoMock(),
      null,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when assignment is missing', async () => {
    const r = await clockInToShift(
      memberAuth,
      makeWorkspaceRepoMock(),
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

  it('FORBIDDEN when caller is not the assignee', async () => {
    const r = await clockInToShift(
      memberAuth,
      makeWorkspaceRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...acceptedAssignment, userId: 'u-other' }),
      }),
      makeTimeEntryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when status is not ACCEPTED', async () => {
    const r = await clockInToShift(
      memberAuth,
      makeWorkspaceRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue({
          ...acceptedAssignment,
          status: 'PENDING_ACCEPT',
        }),
      }),
      makeTimeEntryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('ALREADY_CLOCKED_IN when entry exists', async () => {
    const r = await clockInToShift(
      memberAuth,
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspace),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue({ id: 'te-1' }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'ALREADY_CLOCKED_IN' })
  })

  it('happy path creates entry within tolerance', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'te-1' })
    const r = await clockInToShift(
      memberAuth,
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspace),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue(null),
        create,
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r.success).toBe(true)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        shiftAssignmentId: 'asg-1',
        userId: 'u-1',
        clockInWithinTolerance: true,
      }),
      expect.anything(),
    )
  })

  it('records out-of-tolerance when clock-in is far before startAt', async () => {
    const farPastStart = {
      ...acceptedAssignment,
      shift: {
        ...acceptedAssignment.shift,
        startAt: new Date(NOW_ANCHOR.getTime() + 60 * 60_000), // +60 min
      },
    }
    const create = vi.fn().mockResolvedValue({ id: 'te-1' })
    const r = await clockInToShift(
      memberAuth,
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspace),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(farPastStart),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue(null),
        create,
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r.success).toBe(true)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ clockInWithinTolerance: false }),
      expect.anything(),
    )
  })
})
