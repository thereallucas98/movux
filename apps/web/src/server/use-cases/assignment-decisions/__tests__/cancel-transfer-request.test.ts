import { describe, expect, it, vi } from 'vitest'

import { cancelTransferRequest } from '../cancel-transfer-request.use-case'
import {
  makeAuditRepoMock,
  makeTransferRequestRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'u-1', role: 'USER' }

const baseTr = {
  id: 'tr-1',
  originalAssignmentId: 'a-1',
  originalAssignment: { shiftId: 'shift-1' },
  targetUserId: 'u-target',
  requestedByUserId: 'u-1',
  reason: 'r',
  status: 'PENDING' as const,
  decidedByUserId: null,
  decidedAt: null,
  decisionReason: null,
  newAssignmentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('cancelTransferRequest', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await cancelTransferRequest(
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      null,
      { transferRequestId: 'tr-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN by other user', async () => {
    const r = await cancelTransferRequest(
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi
          .fn()
          .mockResolvedValue({ ...baseTr, requestedByUserId: 'other' }),
      }),
      makeAuditRepoMock(),
      principal,
      { transferRequestId: 'tr-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when already approved', async () => {
    const r = await cancelTransferRequest(
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi
          .fn()
          .mockResolvedValue({ ...baseTr, status: 'APPROVED' }),
      }),
      makeAuditRepoMock(),
      principal,
      { transferRequestId: 'tr-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy: cancels PENDING + audit', async () => {
    const updateMock = vi.fn()
    const auditRepo = makeAuditRepoMock()
    const r = await cancelTransferRequest(
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseTr),
        update: updateMock,
      }),
      auditRepo,
      principal,
      { transferRequestId: 'tr-1' },
    )
    expect(r).toEqual({ success: true })
    expect(updateMock).toHaveBeenCalledWith(
      'tr-1',
      expect.objectContaining({ status: 'CANCELLED' }),
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRANSFER_CANCELLED' }),
      expect.any(Object),
    )
  })
})
