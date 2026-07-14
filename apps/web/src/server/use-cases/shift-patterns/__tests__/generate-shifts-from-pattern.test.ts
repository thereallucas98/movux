import { describe, expect, it, vi } from 'vitest'

import { generateShiftsFromPattern } from '../generate-shifts-from-pattern.use-case'
import {
  makeAuditRepoMock,
  makeScheduleRepoMock,
  makeShiftPatternRepoMock,
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

const pattern = {
  id: 'p-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  name: null,
  daysOfWeek: [1, 3], // Mon, Wed
  startTimeMinutes: 8 * 60,
  endTimeMinutes: 17 * 60,
  crossesMidnight: false,
  headcount: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('generateShiftsFromPattern', () => {
  it('returns VALIDATION_ERROR when rangeStart >= rangeEnd', async () => {
    const r = await generateShiftsFromPattern(
      adminMembership,
      makeScheduleRepoMock(),
      makeShiftPatternRepoMock(),
      makeShiftRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        patternId: 'p-1',
        rangeStart: new Date('2026-08-01'),
        rangeEnd: new Date('2026-07-01'),
      },
    )
    expect(r).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('returns PATTERN_RANGE_TOO_LARGE for >90 day range', async () => {
    const r = await generateShiftsFromPattern(
      adminMembership,
      makeScheduleRepoMock(),
      makeShiftPatternRepoMock(),
      makeShiftRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        patternId: 'p-1',
        rangeStart: new Date('2026-01-01'),
        rangeEnd: new Date('2026-04-15'),
      },
    )
    expect(r).toEqual({ success: false, code: 'PATTERN_RANGE_TOO_LARGE' })
  })

  it('returns INVALID_STATE_TRANSITION when schedule is PUBLISHED', async () => {
    const r = await generateShiftsFromPattern(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftSchedule, status: 'PUBLISHED' }),
      }),
      makeShiftPatternRepoMock({
        findById: vi.fn().mockResolvedValue(pattern),
      }),
      makeShiftRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        patternId: 'p-1',
        rangeStart: new Date('2026-07-01'),
        rangeEnd: new Date('2026-07-15'),
      },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('generates Mon/Wed shifts in 14-day range (4 expected)', async () => {
    // 2026-07-01 (Wed) through 2026-07-15: Wed Jul 1, Mon Jul 6, Wed Jul 8, Mon Jul 13, Wed Jul 15 — Wed Jul 15 not included (rangeEnd exclusive)
    // Wed Jul 1, Mon Jul 6, Wed Jul 8, Mon Jul 13 = 4 shifts
    const bulkMock = vi.fn().mockResolvedValue({ count: 4 })
    const auditRepo = makeAuditRepoMock()
    const r = await generateShiftsFromPattern(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftPatternRepoMock({
        findById: vi.fn().mockResolvedValue(pattern),
      }),
      makeShiftRepoMock({ bulkCreateFromPattern: bulkMock }),
      auditRepo,
      principal,
      {
        patternId: 'p-1',
        rangeStart: new Date('2026-07-01'),
        rangeEnd: new Date('2026-07-15'),
      },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toEqual({ generated: 4, skipped: 0 })
    }
    expect(bulkMock).toHaveBeenCalledWith(expect.any(Array), expect.any(Object))
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PATTERN_GENERATED' }),
      expect.any(Object),
    )
  })

  it('reports skipped on idempotent rerun (count < expected)', async () => {
    const bulkMock = vi.fn().mockResolvedValue({ count: 1 })
    const r = await generateShiftsFromPattern(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftPatternRepoMock({
        findById: vi.fn().mockResolvedValue(pattern),
      }),
      makeShiftRepoMock({ bulkCreateFromPattern: bulkMock }),
      makeAuditRepoMock(),
      principal,
      {
        patternId: 'p-1',
        rangeStart: new Date('2026-07-01'),
        rangeEnd: new Date('2026-07-15'),
      },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.generated).toBe(1)
      expect(r.data.skipped).toBeGreaterThan(0)
    }
  })

  it('crossesMidnight pattern produces endAt on next UTC day', async () => {
    let captured: unknown[] = []
    const bulkMock = vi.fn().mockImplementation((rows: unknown[]) => {
      captured = rows
      return Promise.resolve({ count: rows.length })
    })
    const nightPattern = {
      ...pattern,
      daysOfWeek: [1], // Monday only
      startTimeMinutes: 22 * 60,
      endTimeMinutes: 6 * 60,
      crossesMidnight: true,
    }
    await generateShiftsFromPattern(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftPatternRepoMock({
        findById: vi.fn().mockResolvedValue(nightPattern),
      }),
      makeShiftRepoMock({ bulkCreateFromPattern: bulkMock }),
      makeAuditRepoMock(),
      principal,
      {
        patternId: 'p-1',
        rangeStart: new Date('2026-07-06T00:00:00Z'), // Monday
        rangeEnd: new Date('2026-07-07T00:00:00Z'),
      },
    )
    expect(captured.length).toBe(1)
    const row = captured[0] as { startAt: Date; endAt: Date }
    expect(row.startAt.toISOString()).toBe('2026-07-06T22:00:00.000Z')
    expect(row.endAt.toISOString()).toBe('2026-07-07T06:00:00.000Z')
  })
})
