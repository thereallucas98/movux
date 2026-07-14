import { describe, expect, it, vi } from 'vitest'

import { addShiftTimelineNote } from '../add-shift-timeline-note.use-case'
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

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

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

function callAdd(
  overrides: {
    membership?: ReturnType<typeof makeWorkspaceMembershipRepoMock>
    notesRepo?: ReturnType<typeof makeShiftTimelineNoteRepoMock>
    auditRepo?: ReturnType<typeof makeAuditRepoMock>
    userRepo?: ReturnType<typeof makeUserRepoMock>
    principal?: typeof principal | null
    input?: Partial<Parameters<typeof addShiftTimelineNote>[10]>
  } = {},
) {
  return addShiftTimelineNote(
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
    overrides.notesRepo ?? makeShiftTimelineNoteRepoMock(),
    overrides.auditRepo ?? makeAuditRepoMock(),
    overrides.userRepo ?? makeUserRepoMock(),
    'principal' in overrides ? (overrides.principal ?? null) : principal,
    {
      shiftId: SHIFT_ID,
      note: 'handoff: paciente estável',
      ...(overrides.input ?? {}),
    },
  )
}

describe('addShiftTimelineNote', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await callAdd({ principal: null })
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when caller is not a workspace member (outsider)', async () => {
    const r = await callAdd({
      membership: makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
    })
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is member but not participant', async () => {
    const r = await callAdd({
      membership: makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
    })
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('happy path creates note + emits SHIFT_TIMELINE_NOTE_ADDED audit log', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'n-1',
      shiftId: SHIFT_ID,
      authorUserId: 'u-1',
      note: 'handoff: paciente estável',
      createdAt: new Date('2026-09-15T08:30:00Z'),
    })
    const auditRepo = makeAuditRepoMock()
    const r = await callAdd({
      notesRepo: makeShiftTimelineNoteRepoMock({ create }),
      auditRepo,
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.type).toBe('NOTE_ADDED')
      expect(r.data.id).toBe('note:n-1')
      expect(r.data.payload).toEqual({ note: 'handoff: paciente estável' })
    }
    expect(create).toHaveBeenCalled()
    const auditCalls = (auditRepo.log as ReturnType<typeof vi.fn>).mock.calls
    expect(
      auditCalls.some((c) => c[0]?.action === 'SHIFT_TIMELINE_NOTE_ADDED'),
    ).toBe(true)
  })

  it('trims whitespace before persisting', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'n-1',
      shiftId: SHIFT_ID,
      authorUserId: 'u-1',
      note: 'trimmed',
      createdAt: new Date(),
    })
    await callAdd({
      notesRepo: makeShiftTimelineNoteRepoMock({ create }),
      input: { note: '   trimmed   ' },
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'trimmed' }),
      expect.anything(),
    )
  })

  it('records authorReason in audit metadata', async () => {
    const auditRepo = makeAuditRepoMock()
    await callAdd({
      notesRepo: makeShiftTimelineNoteRepoMock({
        create: vi.fn().mockResolvedValue({
          id: 'n-1',
          shiftId: SHIFT_ID,
          authorUserId: 'u-1',
          note: 'x',
          createdAt: new Date(),
        }),
      }),
      auditRepo,
    })
    const calls = (auditRepo.log as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0]?.[0]?.metadata).toMatchObject({ authorReason: 'COORD' })
  })
})
