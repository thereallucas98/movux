import { describe, expect, it, vi } from 'vitest'

import { approveCandidate } from '../approve-candidate.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeCandidateRepoMock,
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
vi.mock('~/server/notifications/candidate-events', () => ({
  notifyCandidateQueued: vi.fn(),
  notifyCandidateApproved: vi.fn(),
  notifyCandidateRejected: vi.fn(),
  notifyCandidateWithdrawn: vi.fn(),
}))

const adminPrincipal = { userId: 'admin-1', role: 'USER' }
const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const baseCandidate = {
  id: 'c-1',
  shiftId: 'shift-1',
  userId: 'colab-1',
  queuePosition: 1,
  status: 'QUEUED' as const,
  decidedByUserId: null,
  decidedAt: null,
  decisionReason: null,
  resultingAssignmentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  shift: {
    id: 'shift-1',
    scheduleId: 'sch-1',
    categoryId: 'cat-1',
    startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    headcount: 1,
    status: 'OPEN',
    decisionWindowHours: 48,
    assignmentMode: 'OPEN_FOR_APPLY',
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

describe('approveCandidate', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await approveCandidate(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      null,
      { candidateId: 'c-1', autoAccept: false },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN colab', async () => {
    const r = await approveCandidate(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', autoAccept: false },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when not QUEUED', async () => {
    const r = await approveCandidate(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock({
        findByIdWithJoins: vi
          .fn()
          .mockResolvedValue({ ...baseCandidate, status: 'WITHDRAWN' }),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', autoAccept: false },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('SHIFT_HEADCOUNT_FULL when filled', async () => {
    const r = await approveCandidate(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        countByShiftAndStatus: vi.fn().mockResolvedValue(1),
      }),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', autoAccept: false },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_HEADCOUNT_FULL' })
  })

  it('SHIFT_OVERLAP_CONFLICT on re-check', async () => {
    const r = await approveCandidate(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findOverlappingForUser: vi
          .fn()
          .mockResolvedValue([
            { shiftId: 'x', startAt: new Date(), endAt: new Date() },
          ]),
      }),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', autoAccept: false },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_OVERLAP_CONFLICT' })
  })

  it('happy autoAccept=false → PENDING_ACCEPT assignment', async () => {
    const auditRepo = makeAuditRepoMock()
    const newAssignment = {
      id: 'a-1',
      shiftId: 'shift-1',
      userId: 'colab-1',
      assignedByUserId: 'admin-1',
      status: 'PENDING_ACCEPT',
      decisionDeadline: new Date(),
      decidedAt: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const r = await approveCandidate(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        create: vi.fn().mockResolvedValue(newAssignment),
      }),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
        update: vi
          .fn()
          .mockResolvedValue({ ...baseCandidate, status: 'APPROVED' }),
      }),
      auditRepo,
      adminPrincipal,
      { candidateId: 'c-1', autoAccept: false },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.assignment.status).toBe('PENDING_ACCEPT')
      expect(r.data.shiftFilled).toBe(false)
    }
  })

  it('happy autoAccept=true → ACCEPTED + auto-FILL', async () => {
    const setStatusMock = vi.fn()
    const newAssignment = {
      id: 'a-1',
      shiftId: 'shift-1',
      userId: 'colab-1',
      assignedByUserId: 'admin-1',
      status: 'ACCEPTED',
      decisionDeadline: new Date(),
      decidedAt: new Date(),
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    let countCall = 0
    const r = await approveCandidate(
      adminMembership,
      makeShiftRepoMock({ setStatus: setStatusMock }),
      makeAssignmentRepoMock({
        create: vi.fn().mockResolvedValue(newAssignment),
        countByShiftAndStatus: vi
          .fn()
          .mockImplementation(async (_id, statuses) => {
            countCall += 1
            // first call: pre-check filled=0
            // second call (inside tx, post-create): ACCEPTED count = 1 (== headcount=1)
            if (statuses.includes('PENDING_ACCEPT')) return 0
            return 1
          }),
      }),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
        update: vi
          .fn()
          .mockResolvedValue({ ...baseCandidate, status: 'APPROVED' }),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', autoAccept: true },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.assignment.status).toBe('ACCEPTED')
      expect(r.data.shiftFilled).toBe(true)
    }
    expect(setStatusMock).toHaveBeenCalledWith(
      'shift-1',
      'FILLED',
      expect.anything(),
      expect.any(Object),
    )
    expect(countCall).toBeGreaterThanOrEqual(2)
  })

  it('NOT_FOUND when candidate missing', async () => {
    const r = await approveCandidate(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', autoAccept: false },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })
})
