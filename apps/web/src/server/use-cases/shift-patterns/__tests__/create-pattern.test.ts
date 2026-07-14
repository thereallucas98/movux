import { describe, expect, it, vi } from 'vitest'

import { createPattern } from '../create-pattern.use-case'
import {
  makeAuditRepoMock,
  makeCategoryRepoMock,
  makeScheduleRepoMock,
  makeShiftPatternRepoMock,
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

const validInput = {
  workspaceId: 'ws-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  daysOfWeek: [1, 3, 5],
  startTimeMinutes: 8 * 60,
  endTimeMinutes: 17 * 60,
  crossesMidnight: false,
  headcount: 1,
}

describe('createPattern', () => {
  it('returns FORBIDDEN for non-admin', async () => {
    const r = await createPattern(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock(),
      makeShiftPatternRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      validInput,
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns SHIFT_TIME_INVALID when endTime <= startTime and !crossesMidnight', async () => {
    const r = await createPattern(
      adminMembership,
      makeScheduleRepoMock(),
      makeShiftPatternRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { ...validInput, startTimeMinutes: 17 * 60, endTimeMinutes: 8 * 60 },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_TIME_INVALID' })
  })

  it('accepts cross-midnight valid time math (22h-06h)', async () => {
    const newPattern = {
      id: 'p-1',
      scheduleId: 'sch-1',
      categoryId: 'cat-1',
      name: null,
      daysOfWeek: [1],
      startTimeMinutes: 22 * 60,
      endTimeMinutes: 6 * 60,
      crossesMidnight: true,
      headcount: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const r = await createPattern(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftPatternRepoMock({
        create: vi.fn().mockResolvedValue(newPattern),
      }),
      makeCategoryRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: 'cat-1' }),
      }),
      makeAuditRepoMock(),
      principal,
      {
        ...validInput,
        startTimeMinutes: 22 * 60,
        endTimeMinutes: 6 * 60,
        crossesMidnight: true,
      },
    )
    expect(r.success).toBe(true)
  })

  it('creates pattern + audit on happy path', async () => {
    const auditRepo = makeAuditRepoMock()
    const created = {
      id: 'p-1',
      scheduleId: 'sch-1',
      categoryId: 'cat-1',
      name: null,
      daysOfWeek: [1, 3, 5],
      startTimeMinutes: 8 * 60,
      endTimeMinutes: 17 * 60,
      crossesMidnight: false,
      headcount: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const r = await createPattern(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftPatternRepoMock({
        create: vi.fn().mockResolvedValue(created),
      }),
      makeCategoryRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: 'cat-1' }),
      }),
      auditRepo,
      principal,
      validInput,
    )
    expect(r.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PATTERN_CREATED' }),
      expect.any(Object),
    )
  })
})
