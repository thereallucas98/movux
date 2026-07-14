import { describe, expect, it, vi } from 'vitest'

import { rejectCandidate } from '../reject-candidate.use-case'
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

const adminPrincipal = { userId: 'admin-1', role: 'USER' }
const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const baseCandidate = {
  id: 'c-1',
  shiftId: 'shift-1',
  userId: 'colab-1',
  queuePosition: 2,
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
    startAt: new Date(),
    endAt: new Date(),
    headcount: 1,
    status: 'OPEN',
    decisionWindowHours: 48,
    assignmentMode: 'OPEN_FOR_APPLY',
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

describe('rejectCandidate', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await rejectCandidate(
      makeWorkspaceMembershipRepoMock(),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      null,
      { candidateId: 'c-1', reason: 'not qualified' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN colab', async () => {
    const r = await rejectCandidate(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', reason: 'no' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when not QUEUED', async () => {
    const r = await rejectCandidate(
      adminMembership,
      makeCandidateRepoMock({
        findByIdWithJoins: vi
          .fn()
          .mockResolvedValue({ ...baseCandidate, status: 'WITHDRAWN' }),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { candidateId: 'c-1', reason: 'late' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy: REJECTED with reason audit', async () => {
    const auditRepo = makeAuditRepoMock()
    const r = await rejectCandidate(
      adminMembership,
      makeCandidateRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseCandidate),
        update: vi
          .fn()
          .mockResolvedValue({ ...baseCandidate, status: 'REJECTED' }),
      }),
      auditRepo,
      adminPrincipal,
      { candidateId: 'c-1', reason: 'overqualified' },
    )
    expect(r.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CANDIDATE_REJECTED',
        metadata: expect.objectContaining({ reason: 'overqualified' }),
      }),
      expect.any(Object),
    )
  })
})
