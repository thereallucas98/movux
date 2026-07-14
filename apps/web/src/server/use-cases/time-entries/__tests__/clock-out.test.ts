import { describe, expect, it, vi } from 'vitest'

import { clockOutOfShift } from '../clock-out.use-case'
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
    startAt: new Date(NOW_ANCHOR.getTime() - 8 * 60 * 60_000),
    endAt: new Date(NOW_ANCHOR.getTime() - 5 * 60_000), // ended 5 min ago (within tolerance)
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

const openTimeEntry = {
  id: 'te-1',
  shiftAssignmentId: 'asg-1',
  userId: 'u-1',
  clockInAt: new Date(NOW_ANCHOR.getTime() - 8 * 60 * 60_000),
  clockInLocation: null,
  clockInWithinTolerance: true,
  clockOutAt: null,
  clockOutLocation: null,
  clockOutWithinTolerance: null,
  overtimeMinutes: 0,
  closedByUserId: null,
  closedAt: null,
  notes: null,
  createdAt: NOW_ANCHOR,
  updatedAt: NOW_ANCHOR,
}

const memberAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
})

describe('clockOutOfShift', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await clockOutOfShift(
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

  it('FORBIDDEN when caller is not the assignee', async () => {
    const r = await clockOutOfShift(
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

  it('INVALID_STATE_TRANSITION when no time entry exists', async () => {
    const r = await clockOutOfShift(
      memberAuth,
      makeWorkspaceRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('INVALID_STATE_TRANSITION when already clocked out', async () => {
    const r = await clockOutOfShift(
      memberAuth,
      makeWorkspaceRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi
          .fn()
          .mockResolvedValue({ ...openTimeEntry, clockOutAt: NOW_ANCHOR }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy path flips assignment to PENDING_CLOSURE', async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ ...openTimeEntry, clockOutAt: NOW_ANCHOR })
    const updateAssignment = vi.fn().mockResolvedValue({})
    const r = await clockOutOfShift(
      memberAuth,
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspace),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
        update: updateAssignment,
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue(openTimeEntry),
        update,
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r.success).toBe(true)
    expect(updateAssignment).toHaveBeenCalledWith(
      'asg-1',
      { status: 'PENDING_CLOSURE' },
      expect.anything(),
    )
  })

  it('records overtime minutes when clock-out is past shift end', async () => {
    const lateAssignment = {
      ...acceptedAssignment,
      shift: {
        ...acceptedAssignment.shift,
        endAt: new Date(NOW_ANCHOR.getTime() - 90 * 60_000), // -90 min
      },
    }
    const update = vi
      .fn()
      .mockResolvedValue({ ...openTimeEntry, overtimeMinutes: 90 })
    const r = await clockOutOfShift(
      memberAuth,
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspace),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(lateAssignment),
        update: vi.fn(),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue(openTimeEntry),
        update,
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'asg-1' },
    )
    expect(r.success).toBe(true)
    expect(update).toHaveBeenCalledWith(
      'te-1',
      expect.objectContaining({ overtimeMinutes: 90 }),
      expect.anything(),
    )
  })

  it('emits CLT_RULE_WARNING audit log when 11h rest violated', async () => {
    const auditRepo = makeAuditRepoMock()
    await clockOutOfShift(
      memberAuth,
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspace),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
        update: vi.fn(),
      }),
      makeTimeEntryRepoMock({
        findByAssignmentId: vi.fn().mockResolvedValue(openTimeEntry),
        update: vi.fn().mockResolvedValue(openTimeEntry),
        findLastClockOutBefore: vi
          .fn()
          .mockResolvedValue(new Date(NOW_ANCHOR.getTime() - 4 * 60 * 60_000)), // 4h ago
        sumHoursForUserInWeek: vi.fn().mockResolvedValue(20),
      }),
      auditRepo,
      principal,
      { assignmentId: 'asg-1' },
    )
    const cltCalls = (
      auditRepo.log as ReturnType<typeof vi.fn>
    ).mock.calls.filter((c) => c[0]?.action === 'CLT_RULE_WARNING')
    expect(cltCalls.length).toBeGreaterThanOrEqual(1)
  })
})
