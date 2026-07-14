import { describe, expect, it, vi } from 'vitest'

import { forceAcceptAssignment } from '../force-accept-assignment.use-case'
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

const adminPrincipal = { userId: 'admin-1', role: 'USER' }
const colabPrincipal = { userId: 'colab-1', role: 'USER' }

const baseRow = {
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
    headcount: 2,
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

describe('forceAcceptAssignment', () => {
  it('FORBIDDEN when caller is colab', async () => {
    const r = await forceAcceptAssignment(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(baseRow),
      }),
      makeAuditRepoMock(),
      colabPrincipal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('NOT_FOUND when missing', async () => {
    const r = await forceAcceptAssignment(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('INVALID_STATE_TRANSITION on REJECTED', async () => {
    const r = await forceAcceptAssignment(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'REJECTED' }),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy: revives EXPIRED to ACCEPTED + audit revivedFromExpired', async () => {
    const auditRepo = makeAuditRepoMock()
    const r = await forceAcceptAssignment(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'EXPIRED' }),
        update: vi.fn().mockResolvedValue({ ...baseRow, status: 'ACCEPTED' }),
      }),
      auditRepo,
      adminPrincipal,
      { assignmentId: 'a-1' },
    )
    expect(r.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ASSIGNMENT_FORCE_ACCEPTED',
        metadata: expect.objectContaining({ revivedFromExpired: true }),
      }),
      expect.any(Object),
    )
  })
})
