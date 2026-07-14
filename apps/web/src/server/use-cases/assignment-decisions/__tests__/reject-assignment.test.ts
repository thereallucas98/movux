import { describe, expect, it, vi } from 'vitest'

import { rejectAssignment } from '../reject-assignment.use-case'
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

const assigneePrincipal = { userId: 'u-1', role: 'USER' }
const adminPrincipal = { userId: 'admin-1', role: 'USER' }
const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000)

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
    status: 'OPEN',
  },
}

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

describe('rejectAssignment', () => {
  it('UNAUTHENTICATED when principal null', async () => {
    const r = await rejectAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      null,
      { assignmentId: 'a-1', reason: 'no' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN when caller is neither assignee nor admin', async () => {
    const r = await rejectAssignment(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(baseRow),
      }),
      makeAuditRepoMock(),
      adminPrincipal, // not the assignee, no admin role
      { assignmentId: 'a-1', reason: 'no' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('happy: assignee rejects PENDING within window', async () => {
    const updateMock = vi.fn().mockResolvedValue({
      ...baseRow,
      status: 'REJECTED',
      decidedAt: new Date(),
    })
    const r = await rejectAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(baseRow),
        update: updateMock,
      }),
      makeAuditRepoMock(),
      assigneePrincipal,
      { assignmentId: 'a-1', reason: 'doctor visit' },
    )
    expect(r.success).toBe(true)
  })

  it('INVALID_STATE_TRANSITION: assignee tries to reject ACCEPTED (Q7 Ideal)', async () => {
    const r = await rejectAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'ACCEPTED' }),
      }),
      makeAuditRepoMock(),
      assigneePrincipal,
      { assignmentId: 'a-1', reason: 'changed mind' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('admin override: rejects ACCEPTED + unfills FILLED shift', async () => {
    const setStatusMock = vi.fn()
    const updateMock = vi.fn().mockResolvedValue({
      ...baseRow,
      status: 'REJECTED',
    })
    const auditRepo = makeAuditRepoMock()
    const r = await rejectAssignment(
      adminMembership,
      makeShiftRepoMock({ setStatus: setStatusMock }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue({
          ...baseRow,
          status: 'ACCEPTED',
          shift: { ...baseRow.shift, status: 'FILLED' },
        }),
        update: updateMock,
      }),
      auditRepo,
      adminPrincipal,
      { assignmentId: 'a-1', reason: 'sick leave' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.shiftUnfilled).toBe(true)
    expect(setStatusMock).toHaveBeenCalledWith(
      'shift-1',
      'OPEN',
      expect.anything(),
      expect.any(Object),
    )
  })

  it('DECISION_WINDOW_EXPIRED: assignee path enforces window', async () => {
    const r = await rejectAssignment(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue({
          ...baseRow,
          decisionDeadline: new Date(Date.now() - 1000),
        }),
      }),
      makeAuditRepoMock(),
      assigneePrincipal,
      { assignmentId: 'a-1', reason: 'late' },
    )
    expect(r).toEqual({ success: false, code: 'DECISION_WINDOW_EXPIRED' })
  })

  it('admin bypasses window', async () => {
    const r = await rejectAssignment(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue({
          ...baseRow,
          decisionDeadline: new Date(Date.now() - 1000),
        }),
        update: vi.fn().mockResolvedValue({ ...baseRow, status: 'REJECTED' }),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { assignmentId: 'a-1', reason: 'cleanup' },
    )
    expect(r.success).toBe(true)
  })
})
