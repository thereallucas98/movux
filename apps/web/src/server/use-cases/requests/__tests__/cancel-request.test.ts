import { describe, expect, it, vi } from 'vitest'

import { cancelRequest } from '../cancel-request.use-case'
import { makeAuditRepoMock, makeRequestRepoMock } from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'u-1', role: 'USER' }

const baseRow = {
  id: 'req-1',
  workspaceId: 'ws-1',
  type: 'OFFER' as const,
  status: 'PENDING' as const,
  requestedById: 'u-1',
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

describe('cancelRequest', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await cancelRequest(
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      null,
      { requestId: 'req-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when request does not exist', async () => {
    const r = await cancelRequest(
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(null),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1' },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is not the requester', async () => {
    const r = await cancelRequest(
      makeRequestRepoMock({
        findByIdWithRelations: vi
          .fn()
          .mockResolvedValue({ ...baseRow, requestedById: 'u-other' }),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when status is not cancellable', async () => {
    const r = await cancelRequest(
      makeRequestRepoMock({
        findByIdWithRelations: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'APPROVED' }),
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('cancels a PENDING request on the happy path', async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ ...baseRow, status: 'CANCELLED' })
    const r = await cancelRequest(
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue(baseRow),
        update,
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1' },
    )
    expect(r.success).toBe(true)
    expect(update).toHaveBeenCalledWith(
      'req-1',
      { status: 'CANCELLED' },
      expect.anything(),
    )
  })

  it('cancels a PENDING_PEER (SWAP) request', async () => {
    const update = vi.fn().mockResolvedValue({
      ...baseRow,
      type: 'SWAP',
      status: 'CANCELLED',
    })
    const r = await cancelRequest(
      makeRequestRepoMock({
        findByIdWithRelations: vi.fn().mockResolvedValue({
          ...baseRow,
          type: 'SWAP',
          status: 'PENDING_PEER',
        }),
        update,
      }),
      makeAuditRepoMock(),
      principal,
      { requestId: 'req-1' },
    )
    expect(r.success).toBe(true)
  })
})
