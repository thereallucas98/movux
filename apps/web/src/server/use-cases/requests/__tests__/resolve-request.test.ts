import { describe, expect, it, vi } from 'vitest'

import { resolveRequest } from '../resolve-request.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeRequestRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const txStub = {
  shiftAssignment: { update: vi.fn().mockResolvedValue({}) },
}

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(txStub),
    ),
  },
}))
vi.mock('~/server/notifications/request-events', () => ({
  notifyRequestSubmitted: vi.fn(),
  notifyRequestResolved: vi.fn(),
  notifyRequestPeerDecision: vi.fn(),
}))

const principal = { userId: 'u-coord', role: 'USER' }
const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const futureEnd = new Date(futureStart.getTime() + 8 * 60 * 60 * 1000)

const baseRow = {
  id: 'req-1',
  workspaceId: 'ws-1',
  type: 'OFFER' as const,
  status: 'PENDING' as const,
  requestedById: 'u-requester',
  resolvedById: null,
  reason: 'r',
  resolutionReason: null,
  attachmentUrl: null,
  attachmentMimeType: null,
  attachmentSizeBytes: null,
  swapSourceAssignmentId: null,
  swapTargetUserId: null,
  swapTargetAssignmentId: null,
  peerAcceptedAt: null,
  peerRejectedAt: null,
  offerSourceAssignmentId: 'asg-1',
  timeOffStart: null,
  timeOffEnd: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const swapPending = {
  ...baseRow,
  type: 'SWAP' as const,
  status: 'PENDING' as const,
  swapSourceAssignmentId: 'asg-source',
  swapTargetUserId: 'u-target',
  swapTargetAssignmentId: 'asg-target',
  offerSourceAssignmentId: null,
}

const timeOffPending = {
  ...baseRow,
  type: 'TIME_OFF' as const,
  offerSourceAssignmentId: null,
  timeOffStart: new Date('2026-06-01T00:00:00Z'),
  timeOffEnd: new Date('2026-06-05T00:00:00Z'),
}

const acceptedAssignment = {
  id: 'asg',
  shiftId: 'shift',
  userId: 'u-someone',
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

const coordAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COORDENADOR', isActive: true }),
})

describe('resolveRequest', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      null,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when request is missing', async () => {
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(null),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is not coord/admin', async () => {
    const r = await resolveRequest(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(baseRow),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when status is not PENDING', async () => {
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'APPROVED' }),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('REJECT path uniformly sets status to REJECTED', async () => {
    const update = vi.fn().mockResolvedValue({ ...baseRow, status: 'REJECTED' })
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(baseRow),
        update,
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'REJECT', resolutionReason: 'no' },
    )
    expect(r.success).toBe(true)
    expect(update).toHaveBeenCalledWith(
      'req-1',
      expect.objectContaining({
        status: 'REJECTED',
        resolutionReason: 'no',
      }),
      expect.anything(),
    )
  })

  it('OFFER approve flips shift to OPEN_FOR_APPLY', async () => {
    const shiftUpdate = vi.fn().mockResolvedValue({})
    const update = vi.fn().mockResolvedValue({ ...baseRow, status: 'APPROVED' })
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(baseRow),
        update,
      }),
      makeShiftRepoMock({ update: shiftUpdate }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r.success).toBe(true)
    expect(shiftUpdate).toHaveBeenCalledWith(
      'shift',
      { assignmentMode: 'OPEN_FOR_APPLY' },
      expect.anything(),
    )
  })

  it('SWAP approve performs the 3-step userId rotation', async () => {
    txStub.shiftAssignment.update.mockClear()
    const update = vi.fn().mockResolvedValue({
      ...swapPending,
      status: 'APPROVED',
    })
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(swapPending),
        update,
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValueOnce(acceptedAssignment)
          .mockResolvedValueOnce(acceptedAssignment),
        update: vi.fn().mockResolvedValue({}),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r.success).toBe(true)
    // 3-step swap = 3 raw shiftAssignment.update calls (NULL, target, source)
    expect(txStub.shiftAssignment.update).toHaveBeenCalledTimes(3)
    expect(txStub.shiftAssignment.update.mock.calls[0]?.[0]).toEqual({
      where: { id: 'asg-source' },
      data: { userId: null },
    })
  })

  it('TIME_OFF approve cascades cancellation to overlapping assignments', async () => {
    const updateAssignment = vi.fn().mockResolvedValue({})
    const updateShift = vi.fn().mockResolvedValue({})
    const update = vi.fn().mockResolvedValue({
      ...timeOffPending,
      status: 'APPROVED',
    })
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(timeOffPending),
        update,
      }),
      makeShiftRepoMock({ update: updateShift }),
      makeAssignmentRepoMock({
        update: updateAssignment,
        findForUserInRange: vi.fn().mockResolvedValue([
          { id: 'asg-1', shiftId: 'shift-1' },
          { id: 'asg-2', shiftId: 'shift-2' },
        ]),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r.success).toBe(true)
    expect(updateAssignment).toHaveBeenCalledTimes(2)
    expect(updateShift).toHaveBeenCalledTimes(2)
  })

  it('TIME_OFF approve over the cap returns TIME_OFF_TOO_LARGE', async () => {
    const big = Array.from({ length: 51 }, (_, i) => ({
      id: `asg-${i}`,
      shiftId: `shift-${i}`,
    }))
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(timeOffPending),
        update: vi.fn().mockResolvedValue(timeOffPending),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findForUserInRange: vi.fn().mockResolvedValue(big),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'TIME_OFF_TOO_LARGE' })
  })

  it('SWAP approve INVALID_STATE_TRANSITION when an assignment is no longer ACCEPTED', async () => {
    const r = await resolveRequest(
      coordAuth,
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(swapPending),
      }),
      makeShiftRepoMock(),
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
      { requestId: 'req-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })
})
