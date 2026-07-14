import { describe, expect, it, vi } from 'vitest'

import { unassignUser } from '../unassign-user.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'admin-1', role: 'USER' }

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const baseAssignmentWithShift = {
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

describe('unassignUser', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const r = await unassignUser(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      null,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns NOT_FOUND when assignment missing', async () => {
    const r = await unassignUser(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns FORBIDDEN for COLABORADOR', async () => {
    const r = await unassignUser(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(baseAssignmentWithShift),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns INVALID_STATE_TRANSITION when status is ACCEPTED', async () => {
    const r = await unassignUser(
      adminMembership,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue({
          ...baseAssignmentWithShift,
          status: 'ACCEPTED',
        }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy: hard-deletes PENDING + audits', async () => {
    const auditRepo = makeAuditRepoMock()
    const hardDeleteMock = vi.fn()
    const r = await unassignUser(
      adminMembership,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(baseAssignmentWithShift),
        hardDelete: hardDeleteMock,
      }),
      auditRepo,
      principal,
      { assignmentId: 'a-1' },
    )
    expect(r).toEqual({ success: true })
    expect(hardDeleteMock).toHaveBeenCalledWith('a-1', expect.any(Object))
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSIGNMENT_UNASSIGNED' }),
      expect.any(Object),
    )
  })
})
