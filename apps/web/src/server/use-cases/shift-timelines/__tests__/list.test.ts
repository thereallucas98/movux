import { describe, expect, it, vi } from 'vitest'

import { listShiftTimeline } from '../list-shift-timeline.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeCandidateRepoMock,
  makeRequestRepoMock,
  makeScheduleRepoMock,
  makeShiftRepoMock,
  makeShiftTimelineNoteRepoMock,
  makeUserRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }
const SHIFT_ID = 'shift-1'

const baseShift = {
  id: SHIFT_ID,
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date('2026-09-15T08:00:00Z'),
  endAt: new Date('2026-09-15T17:00:00Z'),
  headcount: 1,
  status: 'OPEN' as const,
  assignmentMode: 'DIRECT_ASSIGN' as const,
  decisionWindowHours: 48,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseSchedule = {
  id: 'sch-1',
  workspaceId: 'ws-1',
  categoryId: 'cat-1',
  name: null,
  periodStart: new Date(),
  periodEnd: new Date(),
  status: 'PUBLISHED' as const,
  publishedAt: new Date(),
  closedAt: null,
  deletedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

function callList(
  overrides: {
    membership?: ReturnType<typeof makeWorkspaceMembershipRepoMock>
    audit?: ReturnType<typeof makeAuditRepoMock>
    notes?: ReturnType<typeof makeShiftTimelineNoteRepoMock>
    userRepo?: ReturnType<typeof makeUserRepoMock>
    principal?: typeof principal | null
    input?: Partial<Parameters<typeof listShiftTimeline>[10]>
  } = {},
) {
  return listShiftTimeline(
    overrides.membership ?? adminMembership,
    makeShiftRepoMock({
      findById: vi.fn().mockResolvedValue(baseShift),
    }),
    makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(baseSchedule),
    }),
    makeAssignmentRepoMock(),
    makeCandidateRepoMock(),
    makeRequestRepoMock(),
    overrides.audit ?? makeAuditRepoMock(),
    overrides.notes ?? makeShiftTimelineNoteRepoMock(),
    overrides.userRepo ?? makeUserRepoMock(),
    'principal' in overrides ? (overrides.principal ?? null) : principal,
    { shiftId: SHIFT_ID, ...(overrides.input ?? {}) },
  )
}

describe('listShiftTimeline', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await callList({ principal: null })
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when caller is not a workspace member (outsider)', async () => {
    const r = await callList({
      membership: makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
    })
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is workspace member but not participant', async () => {
    const r = await callList({
      membership: makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
    })
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns merged audit + note events sorted asc', async () => {
    const t1 = new Date('2026-09-15T08:00:00Z')
    const t2 = new Date('2026-09-15T09:00:00Z')
    const t3 = new Date('2026-09-15T10:00:00Z')
    const r = await callList({
      audit: makeAuditRepoMock({
        listForShift: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'a-1',
              actorUserId: 'u-coord',
              action: 'SHIFT_CREATED',
              entityType: 'SHIFT',
              entityId: SHIFT_ID,
              metadata: null,
              createdAt: t1,
            },
            {
              id: 'a-2',
              actorUserId: 'u-coord',
              action: 'ASSIGNMENT_CREATED',
              entityType: 'SHIFT_ASSIGNMENT',
              entityId: 'asg-1',
              metadata: { shiftId: SHIFT_ID },
              createdAt: t3,
            },
          ],
          nextCursor: null,
        }),
      }),
      notes: makeShiftTimelineNoteRepoMock({
        listForShift: vi.fn().mockResolvedValue([
          {
            id: 'n-1',
            shiftId: SHIFT_ID,
            authorUserId: 'u-coord',
            note: 'handoff',
            createdAt: t2,
          },
        ]),
      }),
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.map((e) => e.type)).toEqual([
        'CREATED',
        'NOTE_ADDED',
        'ASSIGNED',
      ])
      expect(r.data[0]?.id).toBe('audit:a-1')
      expect(r.data[1]?.id).toBe('note:n-1')
      expect(r.data[2]?.id).toBe('audit:a-2')
    }
  })

  it('respects order=desc on merged sort', async () => {
    const t1 = new Date('2026-09-15T08:00:00Z')
    const t2 = new Date('2026-09-15T09:00:00Z')
    const r = await callList({
      audit: makeAuditRepoMock({
        listForShift: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'a-1',
              actorUserId: null,
              action: 'SHIFT_CREATED',
              entityType: 'SHIFT',
              entityId: SHIFT_ID,
              metadata: null,
              createdAt: t1,
            },
          ],
          nextCursor: null,
        }),
      }),
      notes: makeShiftTimelineNoteRepoMock({
        listForShift: vi.fn().mockResolvedValue([
          {
            id: 'n-1',
            shiftId: SHIFT_ID,
            authorUserId: 'u-1',
            note: 'x',
            createdAt: t2,
          },
        ]),
      }),
      input: { order: 'desc' },
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.map((e) => e.type)).toEqual(['NOTE_ADDED', 'CREATED'])
    }
  })

  it('passes nextCursor through from audit page', async () => {
    const r = await callList({
      audit: makeAuditRepoMock({
        listForShift: vi
          .fn()
          .mockResolvedValue({ data: [], nextCursor: 'next-cursor' }),
      }),
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.nextCursor).toBe('next-cursor')
  })

  it('passes since filter through to both repos', async () => {
    const since = new Date('2026-09-15T00:00:00Z')
    const auditList = vi.fn().mockResolvedValue({ data: [], nextCursor: null })
    const notesList = vi.fn().mockResolvedValue([])
    await callList({
      audit: makeAuditRepoMock({ listForShift: auditList }),
      notes: makeShiftTimelineNoteRepoMock({ listForShift: notesList }),
      input: { since },
    })
    expect(auditList).toHaveBeenCalledWith(expect.objectContaining({ since }))
    expect(notesList).toHaveBeenCalledWith(SHIFT_ID, { since })
  })

  it('clamps limit to [1, 500]', async () => {
    const auditList = vi.fn().mockResolvedValue({ data: [], nextCursor: null })
    await callList({
      audit: makeAuditRepoMock({ listForShift: auditList }),
      input: { limit: 9999 },
    })
    expect(auditList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 500 }),
    )
  })
})
