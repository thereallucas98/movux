import { describe, expect, it, vi } from 'vitest'

import {
  countActiveMembers,
  countActiveSchedules,
  countRequestsThisMonth,
  countShiftsInMonth,
  countWorkspaceCategories,
  countWorkspaceSpecialties,
  countWorkspaceStorageMB,
  countWorkspaces,
  monthRangeUtc,
} from '../usage-counters'

function makeMockDb() {
  return {
    workspace: { count: vi.fn() },
    workspaceMembership: { count: vi.fn() },
    category: { count: vi.fn() },
    specialty: { count: vi.fn() },
    schedule: { count: vi.fn() },
    shift: { count: vi.fn() },
    request: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  }
}

describe('countWorkspaces', () => {
  it('counts workspaces excluding soft-deleted ones', async () => {
    const db = makeMockDb()
    db.workspace.count.mockResolvedValue(3)
    const n = await countWorkspaces({ db: db as never }, { tenantId: 't-1' })
    expect(n).toBe(3)
    expect(db.workspace.count).toHaveBeenCalledWith({
      where: { tenantId: 't-1', deletedAt: null },
    })
  })
})

describe('countActiveMembers', () => {
  it('counts active workspace members only', async () => {
    const db = makeMockDb()
    db.workspaceMembership.count.mockResolvedValue(15)
    const n = await countActiveMembers(
      { db: db as never },
      { workspaceId: 'w-1' },
    )
    expect(n).toBe(15)
    expect(db.workspaceMembership.count).toHaveBeenCalledWith({
      where: { workspaceId: 'w-1', isActive: true },
    })
  })
})

describe('countWorkspaceCategories', () => {
  it('counts WORKSPACE-scope categories only, excluding soft-deletes', async () => {
    const db = makeMockDb()
    db.category.count.mockResolvedValue(4)
    await countWorkspaceCategories({ db: db as never }, { workspaceId: 'w-1' })
    expect(db.category.count).toHaveBeenCalledWith({
      where: {
        workspaceId: 'w-1',
        scope: 'WORKSPACE',
        isActive: true,
      },
    })
  })
})

describe('countWorkspaceSpecialties', () => {
  it('counts WORKSPACE-scope specialties only', async () => {
    const db = makeMockDb()
    db.specialty.count.mockResolvedValue(2)
    await countWorkspaceSpecialties({ db: db as never }, { workspaceId: 'w-1' })
    expect(db.specialty.count).toHaveBeenCalledWith({
      where: {
        workspaceId: 'w-1',
        scope: 'WORKSPACE',
        isActive: true,
      },
    })
  })
})

describe('countActiveSchedules', () => {
  it('counts only DRAFT and PUBLISHED schedules', async () => {
    const db = makeMockDb()
    db.schedule.count.mockResolvedValue(2)
    await countActiveSchedules({ db: db as never }, { workspaceId: 'w-1' })
    expect(db.schedule.count).toHaveBeenCalledWith({
      where: {
        workspaceId: 'w-1',
        status: { in: ['DRAFT', 'PUBLISHED'] },
      },
    })
  })
})

describe('countShiftsInMonth', () => {
  it('joins through schedule.workspaceId and bounds startAt by the month', async () => {
    const db = makeMockDb()
    db.shift.count.mockResolvedValue(50)
    const monthDate = new Date('2026-05-15T12:00:00Z')
    const n = await countShiftsInMonth(
      { db: db as never },
      {
        workspaceId: 'w-1',
        monthDate,
        timeZone: 'America/Sao_Paulo',
      },
    )
    expect(n).toBe(50)
    const call = db.shift.count.mock.calls[0][0]
    expect(call.where.schedule).toEqual({ workspaceId: 'w-1' })
    expect(call.where.startAt.gte).toBeInstanceOf(Date)
    expect(call.where.startAt.lt).toBeInstanceOf(Date)
    // start should be earlier than lt
    expect(call.where.startAt.gte.getTime()).toBeLessThan(
      call.where.startAt.lt.getTime(),
    )
  })
})

describe('countRequestsThisMonth', () => {
  it('counts requests created in the current month for the workspace', async () => {
    const db = makeMockDb()
    db.request.count.mockResolvedValue(8)
    const now = new Date('2026-05-15T12:00:00Z')
    const n = await countRequestsThisMonth(
      { db: db as never },
      {
        workspaceId: 'w-1',
        now,
        timeZone: 'America/Sao_Paulo',
      },
    )
    expect(n).toBe(8)
    const call = db.request.count.mock.calls[0][0]
    expect(call.where.workspaceId).toBe('w-1')
    expect(call.where.createdAt.gte).toBeInstanceOf(Date)
    expect(call.where.createdAt.lt).toBeInstanceOf(Date)
  })
})

describe('countWorkspaceStorageMB', () => {
  it('returns 0 when nothing has been uploaded', async () => {
    const db = makeMockDb()
    db.request.aggregate.mockResolvedValue({
      _sum: { attachmentSizeBytes: null },
    })
    const mb = await countWorkspaceStorageMB(
      { db: db as never },
      { workspaceId: 'w-1' },
    )
    expect(mb).toBe(0)
  })

  it('rounds up bytes to MB (Math.ceil)', async () => {
    const db = makeMockDb()
    // 1.5 MB → ceil → 2 MB
    db.request.aggregate.mockResolvedValue({
      _sum: { attachmentSizeBytes: Math.floor(1.5 * 1024 * 1024) },
    })
    const mb = await countWorkspaceStorageMB(
      { db: db as never },
      { workspaceId: 'w-1' },
    )
    expect(mb).toBe(2)
  })

  it('ignores rows with NULL attachmentSizeBytes (filter passed to aggregate)', async () => {
    const db = makeMockDb()
    db.request.aggregate.mockResolvedValue({
      _sum: { attachmentSizeBytes: 4 * 1024 * 1024 },
    })
    await countWorkspaceStorageMB({ db: db as never }, { workspaceId: 'w-1' })
    expect(db.request.aggregate).toHaveBeenCalledWith({
      where: {
        workspaceId: 'w-1',
        attachmentSizeBytes: { not: null },
      },
      _sum: { attachmentSizeBytes: true },
    })
  })
})

describe('monthRangeUtc', () => {
  it('returns a 1-month range in São Paulo timezone for a mid-May date', () => {
    const monthDate = new Date('2026-05-15T12:00:00Z')
    const { startUtc, endUtc } = monthRangeUtc(monthDate, 'America/Sao_Paulo')
    // São Paulo is UTC-3 — May 1 at 00:00 SP = May 1 at 03:00 UTC
    expect(startUtc.toISOString()).toBe('2026-05-01T03:00:00.000Z')
    expect(endUtc.toISOString()).toBe('2026-06-01T03:00:00.000Z')
  })

  it('handles December → January rollover (year++)', () => {
    const monthDate = new Date('2026-12-20T12:00:00Z')
    const { startUtc, endUtc } = monthRangeUtc(monthDate, 'America/Sao_Paulo')
    expect(startUtc.toISOString()).toBe('2026-12-01T03:00:00.000Z')
    expect(endUtc.toISOString()).toBe('2027-01-01T03:00:00.000Z')
  })

  it('UTC instant near month boundary still anchored in workspace tz', () => {
    // 2026-06-01 00:00 UTC is still 2026-05-31 in São Paulo (UTC-3) → May bucket
    const monthDate = new Date('2026-06-01T00:00:00Z')
    const { startUtc, endUtc } = monthRangeUtc(monthDate, 'America/Sao_Paulo')
    expect(startUtc.toISOString()).toBe('2026-05-01T03:00:00.000Z')
    expect(endUtc.toISOString()).toBe('2026-06-01T03:00:00.000Z')
  })
})
