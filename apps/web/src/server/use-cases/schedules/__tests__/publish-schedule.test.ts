import { describe, expect, it, vi } from 'vitest'

import { publishSchedule } from '../publish-schedule.use-case'
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
  notifySchedulePublished: vi.fn(),
}))

const principal = { userId: 'user-1', role: 'USER' }

const draftRow = {
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

describe('publishSchedule', () => {
  it('returns INVALID_STATE_TRANSITION when already PUBLISHED', async () => {
    const result = await publishSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftRow, status: 'PUBLISHED' }),
      }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('returns FORBIDDEN for COLABORADOR', async () => {
    const result = await publishSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftRow),
      }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('publishes schedule and writes audit on happy path', async () => {
    const published = {
      ...draftRow,
      status: 'PUBLISHED' as const,
      publishedAt: new Date(),
    }
    const scheduleRepo = makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(draftRow),
      update: vi.fn().mockResolvedValue(published),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await publishSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      scheduleRepo,
      auditRepo,
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('PUBLISHED')
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SCHEDULE_PUBLISHED' }),
      expect.any(Object),
    )
  })
})
