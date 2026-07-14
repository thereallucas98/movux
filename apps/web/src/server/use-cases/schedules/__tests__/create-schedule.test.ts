import { describe, expect, it, vi } from 'vitest'

import { createSchedule } from '../create-schedule.use-case'
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
    tenant: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'tenant-1',
        plan: 'CORPORATE',
        gracePeriodUntil: null,
        timezone: 'America/Sao_Paulo',
      }),
    },
    workspace: {
      findFirst: vi.fn().mockResolvedValue({
        timezone: 'America/Sao_Paulo',
        tenant: {
          id: 'tenant-1',
          plan: 'CORPORATE',
          gracePeriodUntil: null,
          timezone: 'America/Sao_Paulo',
        },
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    workspaceMembership: { count: vi.fn().mockResolvedValue(0) },
    category: { count: vi.fn().mockResolvedValue(0) },
    specialty: { count: vi.fn().mockResolvedValue(0) },
    schedule: { count: vi.fn().mockResolvedValue(0) },
    shift: { count: vi.fn().mockResolvedValue(0) },
    request: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi
        .fn()
        .mockResolvedValue({ _sum: { attachmentSizeBytes: null } }),
    },
  },
}))

const principal = { userId: 'user-1', role: 'USER' }
const WS_ID = 'ws-1'
const CAT_ID = 'cat-1'

function adminCoordRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
  })
}

const validInput = {
  workspaceId: WS_ID,
  categoryId: CAT_ID,
  periodStart: new Date('2026-07-01'),
  periodEnd: new Date('2026-08-01'),
}

describe('createSchedule', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await createSchedule(
      makeWorkspaceMembershipRepoMock(),
      makeCategoryRepoMock(),
      makeScheduleRepoMock(),
      makeAuditRepoMock(),
      null,
      validInput,
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when COLABORADOR', async () => {
    const result = await createSchedule(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeCategoryRepoMock(),
      makeScheduleRepoMock(),
      makeAuditRepoMock(),
      principal,
      validInput,
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns VALIDATION_ERROR when periodStart >= periodEnd', async () => {
    const result = await createSchedule(
      adminCoordRepo(),
      makeCategoryRepoMock(),
      makeScheduleRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        ...validInput,
        periodStart: new Date('2026-08-01'),
        periodEnd: new Date('2026-07-01'),
      },
    )
    expect(result).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('returns NOT_FOUND when category not accessible', async () => {
    const result = await createSchedule(
      adminCoordRepo(),
      makeCategoryRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue(null),
      }),
      makeScheduleRepoMock(),
      makeAuditRepoMock(),
      principal,
      validInput,
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns SCHEDULE_PERIOD_OVERLAP when overlap found', async () => {
    const result = await createSchedule(
      adminCoordRepo(),
      makeCategoryRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: CAT_ID }),
      }),
      makeScheduleRepoMock({
        findOverlapping: vi.fn().mockResolvedValue({ id: 'other' }),
      }),
      makeAuditRepoMock(),
      principal,
      validInput,
    )
    expect(result).toEqual({
      success: false,
      code: 'SCHEDULE_PERIOD_OVERLAP',
    })
  })

  it('creates schedule + audit on happy path', async () => {
    const newSchedule = {
      id: 'sch-1',
      workspaceId: WS_ID,
      categoryId: CAT_ID,
      name: 'Test',
      periodStart: validInput.periodStart,
      periodEnd: validInput.periodEnd,
      status: 'DRAFT',
      publishedAt: null,
      closedAt: null,
      deletedAt: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const scheduleRepo = makeScheduleRepoMock({
      findOverlapping: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(newSchedule),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await createSchedule(
      adminCoordRepo(),
      makeCategoryRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: CAT_ID }),
      }),
      scheduleRepo,
      auditRepo,
      principal,
      { ...validInput, name: 'Test' },
    )
    expect(result.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SCHEDULE_CREATED' }),
      expect.any(Object),
    )
  })
})
