import { describe, expect, it, vi } from 'vitest'

import { createShift } from '../create-shift.use-case'
import {
  makeAuditRepoMock,
  makeCategoryRepoMock,
  makeScheduleRepoMock,
  makeShiftRepoMock,
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
const SCH_ID = 'sch-1'
const CAT_ID = 'cat-1'

function adminMembershipRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
  })
}

const validInput = {
  workspaceId: WS_ID,
  scheduleId: SCH_ID,
  categoryId: CAT_ID,
  startAt: new Date('2026-07-13T08:00:00Z'),
  endAt: new Date('2026-07-13T17:00:00Z'),
  headcount: 2,
}

const draftSchedule = {
  id: SCH_ID,
  workspaceId: WS_ID,
  categoryId: CAT_ID,
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

describe('createShift', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await createShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      null,
      validInput,
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN for COLABORADOR', async () => {
    const result = await createShift(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      validInput,
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns SHIFT_TIME_INVALID when startAt >= endAt', async () => {
    const result = await createShift(
      adminMembershipRepo(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        ...validInput,
        startAt: new Date('2026-07-13T17:00:00Z'),
        endAt: new Date('2026-07-13T08:00:00Z'),
      },
    )
    expect(result).toEqual({ success: false, code: 'SHIFT_TIME_INVALID' })
  })

  it('returns INVALID_STATE_TRANSITION when schedule is PUBLISHED', async () => {
    const result = await createShift(
      adminMembershipRepo(),
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftSchedule, status: 'PUBLISHED' }),
      }),
      makeShiftRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      validInput,
    )
    expect(result).toEqual({
      success: false,
      code: 'INVALID_STATE_TRANSITION',
    })
  })

  it('creates shift + audit on happy path', async () => {
    const newShift = {
      id: 'shift-1',
      scheduleId: SCH_ID,
      categoryId: CAT_ID,
      patternId: null,
      startAt: validInput.startAt,
      endAt: validInput.endAt,
      headcount: 2,
      status: 'OPEN' as const,
      notes: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const shiftRepo = makeShiftRepoMock({
      create: vi.fn().mockResolvedValue(newShift),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await createShift(
      adminMembershipRepo(),
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      shiftRepo,
      makeCategoryRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: CAT_ID }),
      }),
      auditRepo,
      principal,
      validInput,
    )
    expect(result.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SHIFT_CREATED' }),
      expect.any(Object),
    )
  })
})
