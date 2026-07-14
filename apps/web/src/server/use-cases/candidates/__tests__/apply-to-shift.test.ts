import { describe, expect, it, vi } from 'vitest'

import { applyToShift } from '../apply-to-shift.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeCandidateRepoMock,
  makeScheduleRepoMock,
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

const principal = { userId: 'u-1', role: 'USER' }

const baseShift = {
  id: 'shift-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date('2026-09-15T08:00:00Z'),
  endAt: new Date('2026-09-15T17:00:00Z'),
  headcount: 1,
  status: 'OPEN' as const,
  assignmentMode: 'OPEN_FOR_APPLY' as const,
  decisionWindowHours: 48,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

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

const memberAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
})

describe('applyToShift', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await applyToShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      null,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('INVALID_STATE_TRANSITION when shift is DIRECT_ASSIGN', async () => {
    const r = await applyToShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...baseShift, assignmentMode: 'DIRECT_ASSIGN' }),
      }),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('SHIFT_OVERLAP_CONFLICT', async () => {
    const r = await applyToShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeAssignmentRepoMock({
        findOverlappingForUser: vi
          .fn()
          .mockResolvedValue([
            { shiftId: 'x', startAt: new Date(), endAt: new Date() },
          ]),
      }),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_OVERLAP_CONFLICT' })
  })

  it('ALREADY_EXISTS when user has active candidacy', async () => {
    const r = await applyToShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock({
        findActiveByShiftAndUser: vi.fn().mockResolvedValue({ id: 'existing' }),
      }),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'ALREADY_EXISTS' })
  })

  it('NOT_FOUND when shift missing', async () => {
    const r = await applyToShift(
      memberAuth,
      makeScheduleRepoMock(),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('happy: creates candidate with queue position 1', async () => {
    const auditRepo = makeAuditRepoMock()
    const newCandidate = {
      id: 'c-1',
      shiftId: 'shift-1',
      userId: 'u-1',
      queuePosition: 1,
      status: 'QUEUED' as const,
      decidedByUserId: null,
      decidedAt: null,
      decisionReason: null,
      resultingAssignmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const r = await applyToShift(
      memberAuth,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeAssignmentRepoMock(),
      makeCandidateRepoMock({
        nextQueuePosition: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue(newCandidate),
      }),
      auditRepo,
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.queuePosition).toBe(1)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CANDIDATE_QUEUED' }),
      expect.any(Object),
    )
  })
})
