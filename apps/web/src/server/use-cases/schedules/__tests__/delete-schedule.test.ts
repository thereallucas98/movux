import { describe, expect, it, vi } from 'vitest'

import { deleteSchedule } from '../delete-schedule.use-case'
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

const principal = { userId: 'user-1', role: 'USER' }

const row = (status: 'DRAFT' | 'PUBLISHED' | 'CLOSED') => ({
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date(),
  periodEnd: new Date(),
  status,
  publishedAt: status === 'DRAFT' ? null : new Date(),
  closedAt: status === 'CLOSED' ? new Date() : null,
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

describe('deleteSchedule', () => {
  it('hard-deletes DRAFT', async () => {
    const scheduleRepo = makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(row('DRAFT')),
    })
    const result = await deleteSchedule(
      adminRepo(),
      scheduleRepo,
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: true, hardDelete: true })
    expect(scheduleRepo.hardDelete).toHaveBeenCalled()
    expect(scheduleRepo.softDelete).not.toHaveBeenCalled()
  })

  it('soft-deletes PUBLISHED', async () => {
    const scheduleRepo = makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(row('PUBLISHED')),
    })
    const result = await deleteSchedule(
      adminRepo(),
      scheduleRepo,
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: true, hardDelete: false })
    expect(scheduleRepo.softDelete).toHaveBeenCalled()
    expect(scheduleRepo.hardDelete).not.toHaveBeenCalled()
  })

  it('soft-deletes CLOSED', async () => {
    const scheduleRepo = makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(row('CLOSED')),
    })
    const result = await deleteSchedule(
      adminRepo(),
      scheduleRepo,
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: true, hardDelete: false })
    expect(scheduleRepo.softDelete).toHaveBeenCalled()
  })

  it('returns FORBIDDEN for COLABORADOR', async () => {
    const result = await deleteSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(row('DRAFT')),
      }),
      makeAuditRepoMock(),
      principal,
      { scheduleId: 'sch-1' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })
})
