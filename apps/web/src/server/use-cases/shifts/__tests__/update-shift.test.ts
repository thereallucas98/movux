import { describe, expect, it, vi } from 'vitest'

import { updateShift } from '../update-shift.use-case'
import {
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

const principal = { userId: 'user-1', role: 'USER' }

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const baseShift = {
  id: 'shift-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date('2026-07-13T08:00:00Z'),
  endAt: new Date('2026-07-13T17:00:00Z'),
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

describe('updateShift', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const r = await updateShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      null,
      { shiftId: 'shift-1', data: { headcount: 3 } },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns INVALID_STATE_TRANSITION when schedule is PUBLISHED', async () => {
    const r = await updateShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftSchedule, status: 'PUBLISHED' }),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1', data: { headcount: 3 } },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('returns SHIFT_TIME_INVALID when new times invert order', async () => {
    const r = await updateShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(baseShift) }),
      makeCandidateRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        shiftId: 'shift-1',
        data: {
          startAt: new Date('2026-07-13T20:00:00Z'),
          endAt: new Date('2026-07-13T18:00:00Z'),
        },
      },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_TIME_INVALID' })
  })

  it('updates shift + audit on happy path', async () => {
    const updated = { ...baseShift, headcount: 3 }
    const updateMock = vi.fn().mockResolvedValue(updated)
    const auditRepo = makeAuditRepoMock()
    const r = await updateShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({
        findById: vi.fn().mockResolvedValue(baseShift),
        update: updateMock,
      }),
      makeCandidateRepoMock(),
      auditRepo,
      principal,
      { shiftId: 'shift-1', data: { headcount: 3 } },
    )
    expect(r.success).toBe(true)
    expect(updateMock).toHaveBeenCalled()
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SHIFT_UPDATED' }),
      expect.any(Object),
    )
  })

  it('returns INVALID_STATE_TRANSITION when mode-change with QUEUED candidates (Task 11 RQ8)', async () => {
    const r = await updateShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...baseShift, assignmentMode: 'DIRECT_ASSIGN' }),
      }),
      makeCandidateRepoMock({
        countByShift: vi.fn().mockResolvedValue(3),
      }),
      makeAuditRepoMock(),
      principal,
      {
        shiftId: 'shift-1',
        data: { assignmentMode: 'OPEN_FOR_APPLY' },
      },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('allows mode-change when no QUEUED candidates exist', async () => {
    const updateMock = vi.fn().mockResolvedValue({
      ...baseShift,
      assignmentMode: 'OPEN_FOR_APPLY',
    })
    const r = await updateShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...baseShift, assignmentMode: 'DIRECT_ASSIGN' }),
        update: updateMock,
      }),
      makeCandidateRepoMock({
        countByShift: vi.fn().mockResolvedValue(0),
      }),
      makeAuditRepoMock(),
      principal,
      {
        shiftId: 'shift-1',
        data: { assignmentMode: 'OPEN_FOR_APPLY' },
      },
    )
    expect(r.success).toBe(true)
    expect(updateMock).toHaveBeenCalled()
  })

  it('skips candidate count when assignmentMode is unchanged', async () => {
    const countMock = vi.fn().mockResolvedValue(0)
    const updateMock = vi.fn().mockResolvedValue({ ...baseShift, headcount: 5 })
    const r = await updateShift(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({
        findById: vi.fn().mockResolvedValue(baseShift),
        update: updateMock,
      }),
      makeCandidateRepoMock({ countByShift: countMock }),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1', data: { headcount: 5 } },
    )
    expect(r.success).toBe(true)
    expect(countMock).not.toHaveBeenCalled()
  })
})
