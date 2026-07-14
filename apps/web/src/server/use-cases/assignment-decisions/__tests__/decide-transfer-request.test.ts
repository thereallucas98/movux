import { describe, expect, it, vi } from 'vitest'

import { decideTransferRequest } from '../decide-transfer-request.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeShiftRepoMock,
  makeTransferRequestRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))
vi.mock('~/server/notifications/transfer-events', () => ({
  notifyTransferRequested: vi.fn(),
  notifyTransferDecided: vi.fn(),
}))

const adminPrincipal = { userId: 'admin-1', role: 'USER' }
const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const baseTr = {
  id: 'tr-1',
  originalAssignmentId: 'a-1',
  targetUserId: 'u-target',
  requestedByUserId: 'u-1',
  reason: 'doctor',
  status: 'PENDING' as const,
  decidedByUserId: null,
  decidedAt: null,
  decisionReason: null,
  newAssignmentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  originalAssignment: {
    id: 'a-1',
    shiftId: 'shift-1',
    userId: 'u-1',
    status: 'ACCEPTED',
    decisionDeadline: new Date(),
    shift: {
      id: 'shift-1',
      scheduleId: 'sch-1',
      startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endAt: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000,
      ),
      headcount: 1,
      status: 'FILLED',
      decisionWindowHours: 48,
      categoryId: 'cat-1',
      schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
    },
  },
}

describe('decideTransferRequest', () => {
  it('UNAUTHENTICATED when null', async () => {
    const r = await decideTransferRequest(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      null,
      { transferRequestId: 'tr-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN for colab', async () => {
    const r = await decideTransferRequest(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseTr),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { transferRequestId: 'tr-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when already approved', async () => {
    const r = await decideTransferRequest(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi
          .fn()
          .mockResolvedValue({ ...baseTr, status: 'APPROVED' }),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { transferRequestId: 'tr-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('reject happy: status → REJECTED', async () => {
    const updateMock = vi
      .fn()
      .mockResolvedValue({ ...baseTr, status: 'REJECTED' })
    const auditRepo = makeAuditRepoMock()
    const r = await decideTransferRequest(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseTr),
        update: updateMock,
      }),
      auditRepo,
      adminPrincipal,
      {
        transferRequestId: 'tr-1',
        decision: 'REJECT',
        reason: 'no replacement',
      },
    )
    expect(r.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRANSFER_REJECTED' }),
      expect.any(Object),
    )
  })

  it('approve fails on target overlap re-check', async () => {
    const r = await decideTransferRequest(
      adminMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock({
        findOverlappingForUser: vi
          .fn()
          .mockResolvedValue([
            { shiftId: 'x', startAt: new Date(), endAt: new Date() },
          ]),
      }),
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseTr),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { transferRequestId: 'tr-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_OVERLAP_CONFLICT' })
  })

  it('approve fails when target not workspace member', async () => {
    let calls = 0
    const r = await decideTransferRequest(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockImplementation(async () => {
          calls += 1
          return calls === 1 ? { role: 'ADMIN', isActive: true } : null
        }),
      }),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseTr),
      }),
      makeAuditRepoMock(),
      adminPrincipal,
      { transferRequestId: 'tr-1', decision: 'APPROVE' },
    )
    expect(r).toEqual({ success: false, code: 'USER_NOT_WORKSPACE_MEMBER' })
  })

  it('approve happy: 4 audit rows + shift unfilled', async () => {
    let mCalls = 0
    const auditRepo = makeAuditRepoMock()
    const setStatusMock = vi.fn()
    const newAssignment = {
      id: 'a-new',
      shiftId: 'shift-1',
      userId: 'u-target',
      assignedByUserId: 'admin-1',
      status: 'PENDING_ACCEPT',
      decisionDeadline: new Date(),
      decidedAt: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const r = await decideTransferRequest(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockImplementation(async () => {
          mCalls += 1
          return {
            role: mCalls === 1 ? 'ADMIN' : 'COLABORADOR',
            isActive: true,
          }
        }),
      }),
      makeShiftRepoMock({ setStatus: setStatusMock }),
      makeAssignmentRepoMock({
        update: vi
          .fn()
          .mockResolvedValue({ ...newAssignment, status: 'TRANSFERRED' }),
        create: vi.fn().mockResolvedValue(newAssignment),
        findOverlappingForUser: vi.fn().mockResolvedValue([]),
      }),
      makeTransferRequestRepoMock({
        findByIdWithJoins: vi.fn().mockResolvedValue(baseTr),
        update: vi.fn().mockResolvedValue({ ...baseTr, status: 'APPROVED' }),
      }),
      auditRepo,
      adminPrincipal,
      { transferRequestId: 'tr-1', decision: 'APPROVE' },
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.shiftUnfilled).toBe(true)
    // 4 audit rows: ASSIGNMENT_TRANSFERRED, ASSIGNMENT_CREATED, TRANSFER_APPROVED, SHIFT_UNFILLED
    expect(auditRepo.log).toHaveBeenCalledTimes(4)
    expect(setStatusMock).toHaveBeenCalled()
  })
})
