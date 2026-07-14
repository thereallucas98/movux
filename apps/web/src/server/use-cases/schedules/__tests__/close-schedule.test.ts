import { describe, expect, it, vi } from 'vitest'

import { closeSchedule } from '../close-schedule.use-case'
import {
  makeAuditRepoMock,
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
vi.mock('~/server/notifications/schedule-events', () => ({
  notifyScheduleClosed: vi.fn(),
}))

const principal = { userId: 'user-1', role: 'USER' }

const publishedRow = (periodEnd: Date) => ({
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date('2026-07-01'),
  periodEnd,
  status: 'PUBLISHED' as const,
  publishedAt: new Date('2026-07-01'),
  closedAt: null,
  deletedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

function adminRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
  })
}

describe('closeSchedule', () => {
  it('returns INVALID_STATE_TRANSITION on DRAFT', async () => {
    const result = await closeSchedule(
      adminRepo(),
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...publishedRow(new Date()), status: 'DRAFT' }),
      }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('returns closedEarly=true when closing before periodEnd', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const row = publishedRow(future)
    const scheduleRepo = makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(row),
      update: vi
        .fn()
        .mockResolvedValue({ ...row, status: 'CLOSED', closedAt: new Date() }),
    })
    const result = await closeSchedule(
      adminRepo(),
      scheduleRepo,
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.closedEarly).toBe(true)
  })

  it('returns closedEarly=false when closing after periodEnd', async () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const row = publishedRow(past)
    const scheduleRepo = makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(row),
      update: vi
        .fn()
        .mockResolvedValue({ ...row, status: 'CLOSED', closedAt: new Date() }),
    })
    const result = await closeSchedule(
      adminRepo(),
      scheduleRepo,
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.closedEarly).toBe(false)
  })

  it('returns FORBIDDEN for COLABORADOR', async () => {
    const result = await closeSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(publishedRow(new Date())),
      }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })
})
