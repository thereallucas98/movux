import { describe, expect, it, vi } from 'vitest'

import { updateSchedule } from '../update-schedule.use-case'
import {
  makeAuditRepoMock,
  makeCategoryRepoMock,
  makeScheduleRepoMock,
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

const draftRow = {
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date('2026-07-01'),
  periodEnd: new Date('2026-08-01'),
  status: 'DRAFT' as const,
  publishedAt: null,
  closedAt: null,
  deletedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function adminRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
  })
}

describe('updateSchedule', () => {
  it('returns NOT_FOUND when schedule missing', async () => {
    const result = await updateSchedule(
      makeWorkspaceMembershipRepoMock(),
      makeCategoryRepoMock(),
      makeScheduleRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1', data: { name: 'x' } },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns FORBIDDEN for COLABORADOR', async () => {
    const result = await updateSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeCategoryRepoMock(),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftRow),
      }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1', data: { name: 'x' } },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns INVALID_STATE_TRANSITION on PUBLISHED schedule', async () => {
    const result = await updateSchedule(
      adminRepo(),
      makeCategoryRepoMock(),
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftRow, status: 'PUBLISHED' }),
      }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1', data: { name: 'x' } },
    )
    expect(result).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('returns SCHEDULE_PERIOD_OVERLAP on new period collision', async () => {
    const result = await updateSchedule(
      adminRepo(),
      makeCategoryRepoMock(),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftRow),
        findOverlapping: vi.fn().mockResolvedValue({ id: 'other' }),
      }),
      makeAuditRepoMock(),
      principal,
      {
        scheduleId: 'sch-1',
        data: {
          periodStart: new Date('2026-09-01'),
          periodEnd: new Date('2026-10-01'),
        },
      },
    )
    expect(result).toEqual({
      success: false,
      code: 'SCHEDULE_PERIOD_OVERLAP',
    })
  })

  it('updates on happy DRAFT path + writes audit', async () => {
    const scheduleRepo = makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(draftRow),
      update: vi.fn().mockResolvedValue({ ...draftRow, name: 'New name' }),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await updateSchedule(
      adminRepo(),
      makeCategoryRepoMock(),
      scheduleRepo,
      auditRepo,
      principal,
      { scheduleId: 'sch-1', data: { name: 'New name' } },
    )
    expect(result.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SCHEDULE_UPDATED' }),
      expect.any(Object),
    )
  })
})
