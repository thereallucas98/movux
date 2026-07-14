import { describe, expect, it, vi } from 'vitest'

import { withdrawFromShift } from '../withdraw-from-shift.use-case'
import {
  makeAuditRepoMock,
  makeCandidateRepoMock,
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

const baseCandidate = {
  id: 'c-1',
  shiftId: 'shift-1',
  userId: 'u-1',
  queuePosition: 3,
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
    startAt: new Date(),
    endAt: new Date(),
    headcount: 1,
    decisionWindowHours: 48,
    assignmentMode: 'OPEN_FOR_APPLY' as const,
    status: 'OPEN' as const,
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

describe('withdrawFromShift', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await withdrawFromShift(
      makeWorkspaceMembershipRepoMock(),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      null,
      { candidateId: 'c-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN when not the owner', async () => {
    const r = await withdrawFromShift(
      makeWorkspaceMembershipRepoMock(),
      makeCandidateRepoMock({
        findByIdWithJoins: vi
          .fn()
          .mockResolvedValue({ ...baseCandidate, userId: 'other' }),
      }),
      makeAuditRepoMock(),
      principal,
      { candidateId: 'c-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when status is APPROVED', async () => {
    const r = await withdrawFromShift(
      makeWorkspaceMembershipRepoMock(),
      makeCandidateRepoMock({
        findByIdWithJoins: vi
          .fn()
          .mockResolvedValue({ ...baseCandidate, status: 'APPROVED' }),
      }),
      makeAuditRepoMock(),
      principal,
      { candidateId: 'c-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy: WITHDRAWN + audit', async () => {
    const updateMock = vi.fn()
    const auditRepo = makeAuditRepoMock()
    const r = await withdrawFromShift(
      makeWorkspaceMembershipRepoMock(),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
        update: updateMock,
      }),
      auditRepo,
      principal,
      { candidateId: 'c-1' },
    )
    expect(r).toEqual({ success: true })
    expect(updateMock).toHaveBeenCalledWith(
      'c-1',
      expect.objectContaining({ status: 'WITHDRAWN' }),
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CANDIDATE_WITHDRAWN' }),
      expect.any(Object),
    )
  })
})
