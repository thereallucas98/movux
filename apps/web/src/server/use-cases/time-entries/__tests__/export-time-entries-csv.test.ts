import { describe, expect, it, vi } from 'vitest'

import { exportTimeEntriesCsv } from '../export-time-entries-csv.use-case'
import {
  makeTimeEntryRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'u-coord', role: 'USER' }

const coordAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COORDENADOR', isActive: true }),
})

const sampleRow = {
  id: 'te-1',
  shiftAssignmentId: 'asg-1',
  userId: 'u-1',
  clockInAt: new Date('2026-09-15T08:00:00.000Z'),
  clockInLocation: null,
  clockInWithinTolerance: true,
  clockOutAt: new Date('2026-09-15T17:30:00.000Z'),
  clockOutLocation: null,
  clockOutWithinTolerance: true,
  overtimeMinutes: 30,
  closedByUserId: 'u-coord',
  closedAt: new Date('2026-09-15T18:00:00.000Z'),
  notes: 'turno ok',
  createdAt: new Date(),
  updatedAt: new Date(),
  shiftAssignment: {
    id: 'asg-1',
    shiftId: 'shift-1',
    userId: 'u-1',
    status: 'COMPLETED',
    shift: {
      id: 'shift-1',
      scheduleId: 'sch-1',
      startAt: new Date('2026-09-15T08:00:00.000Z'),
      endAt: new Date('2026-09-15T17:00:00.000Z'),
      schedule: { workspaceId: 'ws-1' },
    },
    user: { id: 'u-1', fullName: 'Maria Silva' },
  },
}

describe('exportTimeEntriesCsv', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await exportTimeEntriesCsv(
      coordAuth,
      makeTimeEntryRepoMock(),
      null,
      { workspaceId: 'ws-1' },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN when caller is COLABORADOR', async () => {
    const r = await exportTimeEntriesCsv(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeTimeEntryRepoMock(),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('EXPORT_TOO_LARGE when count exceeds the cap', async () => {
    const r = await exportTimeEntriesCsv(
      coordAuth,
      makeTimeEntryRepoMock({
        countForWorkspace: vi.fn().mockResolvedValue(50_001),
      }),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(r).toEqual({ success: false, code: 'EXPORT_TOO_LARGE' })
  })

  it('happy path serializes rows + sets filename + content-type', async () => {
    const r = await exportTimeEntriesCsv(
      coordAuth,
      makeTimeEntryRepoMock({
        countForWorkspace: vi.fn().mockResolvedValue(1),
        listForWorkspace: vi
          .fn()
          .mockResolvedValue({ data: [sampleRow], nextCursor: null }),
      }),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.contentType).toBe('text/csv; charset=utf-8')
      expect(r.data.filename).toMatch(
        /^time-entries-ws-1-\d{4}-\d{2}-\d{2}\.csv$/,
      )
      expect(r.data.body).toContain('time_entry_id,user_id,user_full_name,')
      expect(r.data.body).toContain('te-1,u-1,Maria Silva,')
      expect(r.data.body.endsWith('\r\n')).toBe(true)
    }
  })

  it('empty body when no rows match', async () => {
    const r = await exportTimeEntriesCsv(
      coordAuth,
      makeTimeEntryRepoMock({
        countForWorkspace: vi.fn().mockResolvedValue(0),
        listForWorkspace: vi
          .fn()
          .mockResolvedValue({ data: [], nextCursor: null }),
      }),
      principal,
      { workspaceId: 'ws-1' },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      // Header + trailing CRLF only
      expect(r.data.body.split('\r\n').filter(Boolean)).toHaveLength(1)
    }
  })
})
