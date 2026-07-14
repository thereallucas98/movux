import { describe, expect, it, vi } from 'vitest'

import { requestTransfer } from '../request-transfer.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
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

const principal = { userId: 'u-1', role: 'USER' }
const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000)

const baseRow = {
  id: 'a-1',
  shiftId: 'shift-1',
  userId: 'u-1',
  assignedByUserId: 'admin-1',
  status: 'PENDING_ACCEPT' as const,
  decisionDeadline: futureDeadline,
  decidedAt: null,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  shift: {
    id: 'shift-1',
    scheduleId: 'sch-1',
    startAt: new Date('2026-08-15T08:00:00Z'),
    endAt: new Date('2026-08-15T17:00:00Z'),
    headcount: 1,
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

describe('requestTransfer', () => {
  it('UNAUTHENTICATED when null', async () => {
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock(),
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      null,
      { assignmentId: 'a-1', targetUserId: 'u-2', reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('VALIDATION_ERROR when targetUserId equals self', async () => {
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock(),
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1', targetUserId: principal.userId, reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('FORBIDDEN when caller is not assignee', async () => {
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, userId: 'other' }),
      }),
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1', targetUserId: 'u-2', reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when status is REJECTED', async () => {
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock(),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'REJECTED' }),
      }),
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1', targetUserId: 'u-2', reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('USER_NOT_WORKSPACE_MEMBER when target not member', async () => {
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(baseRow),
      }),
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1', targetUserId: 'u-2', reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'USER_NOT_WORKSPACE_MEMBER' })
  })

  it('SHIFT_OVERLAP_CONFLICT when target has overlap', async () => {
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(baseRow),
        findOverlappingForUser: vi
          .fn()
          .mockResolvedValue([
            { shiftId: 'other', startAt: new Date(), endAt: new Date() },
          ]),
      }),
      makeTransferRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1', targetUserId: 'u-2', reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_OVERLAP_CONFLICT' })
  })

  it('happy from PENDING_ACCEPT', async () => {
    const auditRepo = makeAuditRepoMock()
    const trRepo = makeTransferRequestRepoMock({
      create: vi.fn().mockResolvedValue({
        id: 'tr-1',
        originalAssignmentId: 'a-1',
        targetUserId: 'u-2',
        requestedByUserId: 'u-1',
        reason: 'doctor',
        status: 'PENDING',
        decidedByUserId: null,
        decidedAt: null,
        decisionReason: null,
        newAssignmentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue(baseRow),
      }),
      trRepo,
      auditRepo,
      principal,
      { assignmentId: 'a-1', targetUserId: 'u-2', reason: 'doctor' },
    )
    expect(r.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRANSFER_REQUESTED' }),
      expect.any(Object),
    )
  })

  it('happy from ACCEPTED', async () => {
    const r = await requestTransfer(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...baseRow, status: 'ACCEPTED' }),
      }),
      makeTransferRequestRepoMock({
        create: vi.fn().mockResolvedValue({
          id: 'tr-1',
          originalAssignmentId: 'a-1',
          targetUserId: 'u-2',
          requestedByUserId: 'u-1',
          reason: 'r',
          status: 'PENDING',
          decidedByUserId: null,
          decidedAt: null,
          decisionReason: null,
          newAssignmentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      makeAuditRepoMock(),
      principal,
      { assignmentId: 'a-1', targetUserId: 'u-2', reason: 'r' },
    )
    expect(r.success).toBe(true)
  })
})
