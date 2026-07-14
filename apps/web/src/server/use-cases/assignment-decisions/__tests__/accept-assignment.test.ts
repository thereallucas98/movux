import { describe, expect, it, vi } from 'vitest'

import { acceptAssignment } from '../accept-assignment.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))
vi.mock('~/server/notifications/assignment-events', () => ({
  notifyAssignmentCreated: vi.fn(),
  notifyAssignmentAccepted: vi.fn(),
  notifyAssignmentRejected: vi.fn(),
}))

const principal = { userId: 'u-1', role: 'USER' }

const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000)

const baseRow = {
  id: 'a-1',
  shiftId: 'shift-1',
  userId: 'u-1',
  assignedByUserId: 'admin-1',
  status: 'PENDING_ACCEPT' as const,
  decisionDeadline: futureDeadline,
  decidedAt: null,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  shift: {
    id: 'shift-1',
    scheduleId: 'sch-1',
    startAt: new Date(),
    endAt: new Date(),
    headcount: 2,
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

describe('acceptAssignment', () => {
  it('UNAUTHENTICATED when principal null', async () => {
    const r = await acceptAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      null,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when assignment missing', async () => {
    const r = await acceptAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is not the assignee', async () => {
    const r = await acceptAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, userId: 'other' }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when status is not PENDING', async () => {
    const r = await acceptAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'ACCEPTED' }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('DECISION_WINDOW_EXPIRED when deadline passed', async () => {
    const r = await acceptAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, decisionDeadline: pastDeadline }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'DECISION_WINDOW_EXPIRED' })
  })

  it('on OPEN_FOR_APPLY shift, cancels other ACCEPTED assignments (OFFER closure)', async () => {
    const offerRow = {
      ...baseRow,
      shift: { ...baseRow.shift, assignmentMode: 'OPEN_FOR_APPLY' },
    }
    const others = [
      {
        ...baseRow,
        id: 'a-incumbent',
        userId: 'u-incumbent',
        status: 'ACCEPTED',
      },
      { ...baseRow, id: 'a-1', userId: 'u-1', status: 'ACCEPTED' }, // the one just accepted
      {
        ...baseRow,
        id: 'a-pending',
        userId: 'u-pending',
        status: 'PENDING_ACCEPT',
      },
    ]
    const updateMock = vi.fn().mockResolvedValue({
      ...baseRow,
      status: 'ACCEPTED',
      decidedAt: new Date(),
    })
    const auditRepo = makeAuditRepoMock()
    const r = await acceptAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(offerRow),
        update: updateMock,
        listForShift: vi.fn().mockResolvedValue(others),
        countByShiftAndStatus: vi.fn().mockResolvedValue(1),
      }),
      auditRepo,
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r.success).toBe(true)
    // First update is the self-accept; second update is the incumbent cancel
    expect(updateMock).toHaveBeenCalledWith(
      'a-incumbent',
      expect.objectContaining({ status: 'CANCELLED' }),
      expect.anything(),
    )
    // PENDING_ACCEPT row not touched
    expect(updateMock).not.toHaveBeenCalledWith(
      'a-pending',
      expect.anything(),
      expect.anything(),
    )
    // self row not double-cancelled
    expect(updateMock).not.toHaveBeenCalledWith(
      'a-1',
      expect.objectContaining({ status: 'CANCELLED' }),
      expect.anything(),
    )
  })

  it('happy path with last-slot triggers SHIFT_FILLED', async () => {
    const setStatusMock = vi.fn()
    const updateMock = vi.fn().mockResolvedValue({
      ...baseRow,
      status: 'ACCEPTED',
      decidedAt: new Date(),
    })
    const auditRepo = makeAuditRepoMock()
    const r = await acceptAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock({ setStatus: setStatusMock }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(baseRow),
        update: updateMock,
        countByShiftAndStatus: vi.fn().mockResolvedValue(2), // matches headcount=2
      }),
      auditRepo,
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.shiftFilled).toBe(true)
    expect(setStatusMock).toHaveBeenCalledWith(
      'shift-1',
      'FILLED',
      expect.anything(),
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledTimes(2) // ASSIGNMENT_ACCEPTED + SHIFT_FILLED
  })
})
