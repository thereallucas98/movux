import { describe, expect, it, vi } from 'vitest'

import { deleteShift } from '../delete-shift.use-case'
import {
  makeAuditRepoMock,
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

const principal = { userId: 'user-1', role: 'USER' }

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const baseShift = {
  id: 'shift-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date(),
  endAt: new Date(),
  headcount: 1,
  status: 'OPEN' as const,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const draftSchedule = {
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date(),
  periodEnd: new Date(),
  status: 'DRAFT' as const,
  publishedAt: null,
  closedAt: null,
  deletedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('deleteShift', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const r = await deleteShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeAuditRepoMock(),
      null,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN for non-admin', async () => {
    const r = await deleteShift(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('hard-deletes when schedule is DRAFT', async () => {
    const hardDeleteMock = vi.fn()
    const r = await deleteShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({
        findById: vi.fn().mockResolvedValue(baseShift),
        hardDelete: hardDeleteMock,
      }),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: true, mode: 'HARD' })
    expect(hardDeleteMock).toHaveBeenCalled()
  })

  it('sets status=CANCELLED when schedule is PUBLISHED', async () => {
    const setStatusMock = vi.fn()
    const r = await deleteShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftSchedule, status: 'PUBLISHED' }),
      }),
      makeShiftRepoMock({
        findById: vi.fn().mockResolvedValue(baseShift),
        setStatus: setStatusMock,
      }),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1', reason: 'no-show' },
    )
    expect(r).toEqual({ success: true, mode: 'CANCELLED' })
    expect(setStatusMock).toHaveBeenCalledWith(
      'shift-1',
      'CANCELLED',
      expect.objectContaining({ cancelReason: 'no-show' }),
      expect.any(Object),
    )
  })

  it('returns INVALID_STATE_TRANSITION when schedule is CLOSED', async () => {
    const r = await deleteShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftSchedule, status: 'CLOSED' }),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })
})
