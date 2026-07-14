import { describe, expect, it, vi } from 'vitest'

import { peerRespondSwap } from '../peer-respond-swap.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeRequestRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))
vi.mock('~/server/notifications/request-events', () => ({
  notifyRequestSubmitted: vi.fn(),
  notifyRequestResolved: vi.fn(),
  notifyRequestPeerDecision: vi.fn(),
}))

const principal = { userId: 'u-target', role: 'USER' }
const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const futureEnd = new Date(futureStart.getTime() + 8 * 60 * 60 * 1000)

const swapPendingPeer = {
  id: 'req-1',
  workspaceId: 'ws-1',
  type: 'SWAP' as const,
  status: 'PENDING_PEER' as const,
  requestedById: 'u-requester',
  resolvedById: null,
  reason: 'r',
  resolutionReason: null,
  attachmentUrl: null,
  attachmentMimeType: null,
  attachmentSizeBytes: null,
  swapSourceAssignmentId: 'asg-source',
  swapTargetUserId: 'u-target',
  swapTargetAssignmentId: 'asg-target',
  peerAcceptedAt: null,
  peerRejectedAt: null,
  offerSourceAssignmentId: null,
  timeOffStart: null,
  timeOffEnd: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const acceptedAssignment = {
  id: 'asg',
  shiftId: 'shift',
  userId: 'someone',
  assignedByUserId: 'u-coord',
  status: 'ACCEPTED' as const,
  decisionDeadline: new Date(),
  decidedAt: new Date(),
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  shift: {
    id: 'shift',
    scheduleId: 'sch',
    categoryId: 'cat',
    startAt: futureStart,
    endAt: futureEnd,
    headcount: 1,
    status: 'OPEN',
    assignmentMode: 'DIRECT_ASSIGN',
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

describe('peerRespondSwap', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await peerRespondSwap(
      makeWorkspaceMembershipRepoMock(),
      makeRequestRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      null,
      { requestId: 'req-1', decision: 'ACCEPT' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when request does not exist', async () => {
    const r = await peerRespondSwap(
      makeWorkspaceMembershipRepoMock(),
      makeRequestRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'ACCEPT' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is not the swap target', async () => {
    const r = await peerRespondSwap(
      makeWorkspaceMembershipRepoMock(),
      makeRequestRepoMock({
        findById: vi.fn().mockResolvedValue({
          ...swapPendingPeer,
          swapTargetUserId: 'u-other',
        }),
      }),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'ACCEPT' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when request status is no longer PENDING_PEER', async () => {
    const r = await peerRespondSwap(
      makeWorkspaceMembershipRepoMock(),
      makeRequestRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...swapPendingPeer, status: 'PENDING' }),
      }),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'ACCEPT' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('INVALID_STATE_TRANSITION on ACCEPT when an assignment is no longer ACCEPTED', async () => {
    const r = await peerRespondSwap(
      makeWorkspaceMembershipRepoMock(),
      makeRequestRepoMock({
        findById: vi.fn().mockResolvedValue(swapPendingPeer),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValueOnce(acceptedAssignment)
          .mockResolvedValueOnce({
            ...acceptedAssignment,
            status: 'CANCELLED',
          }),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'ACCEPT' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('ACCEPT moves the request to PENDING and sets peerAcceptedAt', async () => {
    const update = vi.fn().mockResolvedValue({
      ...swapPendingPeer,
      status: 'PENDING',
      peerAcceptedAt: new Date(),
    })
    const r = await peerRespondSwap(
      makeWorkspaceMembershipRepoMock(),
      makeRequestRepoMock({
        findById: vi.fn().mockResolvedValue(swapPendingPeer),
        update,
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValueOnce(acceptedAssignment)
          .mockResolvedValueOnce(acceptedAssignment),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'ACCEPT' },
    )
    expect(r.success).toBe(true)
    expect(update).toHaveBeenCalledWith(
      'req-1',
      expect.objectContaining({ status: 'PENDING' }),
      expect.anything(),
    )
  })

  it('REJECT moves the request to REJECTED and sets peerRejectedAt', async () => {
    const update = vi.fn().mockResolvedValue({
      ...swapPendingPeer,
      status: 'REJECTED',
      peerRejectedAt: new Date(),
    })
    const r = await peerRespondSwap(
      makeWorkspaceMembershipRepoMock(),
      makeRequestRepoMock({
        findById: vi.fn().mockResolvedValue(swapPendingPeer),
        update,
      }),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'REJECT' },
    )
    expect(r.success).toBe(true)
    expect(update).toHaveBeenCalledWith(
      'req-1',
      expect.objectContaining({ status: 'REJECTED' }),
      expect.anything(),
    )
  })
})
