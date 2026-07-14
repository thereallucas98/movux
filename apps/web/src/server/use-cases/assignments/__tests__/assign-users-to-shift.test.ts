import { describe, expect, it, vi } from 'vitest'

import { assignUsersToShift } from '../assign-users-to-shift.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeScheduleRepoMock,
  makeShiftCompositionRepoMock,
  makeShiftRepoMock,
  makeUserSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))
vi.mock('~/server/notifications/assignment-events', () => ({
  notifyAssignmentCreated: vi.fn(),
  notifyAssignmentAccepted: vi.fn(),
  notifyAssignmentRejected: vi.fn(),
}))

const principal = { userId: 'admin-1', role: 'USER' }
const WS_ID = 'ws-1'
const SHIFT_ID = 'shift-1'

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const publishedSchedule = {
  id: 'sch-1',
  workspaceId: WS_ID,
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

const baseShift = {
  id: SHIFT_ID,
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date('2026-07-13T08:00:00Z'),
  endAt: new Date('2026-07-13T17:00:00Z'),
  headcount: 2,
  status: 'OPEN' as const,
  decisionWindowHours: 48,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeBag() {
  return {
    membership: adminMembership,
    schedule: makeScheduleRepoMock({
      findById: vi.fn().mockResolvedValue(publishedSchedule),
    }),
    shift: makeShiftRepoMock({
      findById: vi.fn().mockResolvedValue(baseShift),
    }),
    assignment: makeAssignmentRepoMock({
      countByShiftAndStatus: vi.fn().mockResolvedValue(0),
      findOverlappingForUser: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async (data) => ({
        id: `a-${data.userId}`,
        ...data,
        rejectionReason: null,
        decidedAt: data.decidedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    }),
    userSpecialty: makeUserSpecialtyRepoMock({
      findActiveByMember: vi.fn().mockResolvedValue(null),
    }),
    composition: makeShiftCompositionRepoMock({
      findByShift: vi.fn().mockResolvedValue([]),
    }),
    audit: makeAuditRepoMock(),
  }
}

describe('assignUsersToShift', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const r = await assignUsersToShift(
      makeWorkspaceMembershipRepoMock(),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1'] },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN for COLABORADOR', async () => {
    const r = await assignUsersToShift(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeScheduleRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1'] },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns VALIDATION_ERROR for duplicate userIds', async () => {
    const bag = makeBag()
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1', 'u-1'] },
    )
    expect(r).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('returns INVALID_STATE_TRANSITION when schedule is DRAFT', async () => {
    const bag = makeBag()
    bag.schedule = makeScheduleRepoMock({
      findById: vi
        .fn()
        .mockResolvedValue({ ...publishedSchedule, status: 'DRAFT' }),
    })
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1'] },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('returns INVALID_STATE_TRANSITION when shift is OPEN_FOR_APPLY (Task 11 mode guard)', async () => {
    const bag = makeBag()
    bag.shift = makeShiftRepoMock({
      findById: vi
        .fn()
        .mockResolvedValue({ ...baseShift, assignmentMode: 'OPEN_FOR_APPLY' }),
    })
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1'] },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('returns SHIFT_HEADCOUNT_FULL when filled+new exceeds headcount', async () => {
    const bag = makeBag()
    bag.assignment.countByShiftAndStatus = vi.fn().mockResolvedValue(2) // shift.headcount=2 already filled
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1'] },
    )
    expect(r).toEqual({ success: false, code: 'SHIFT_HEADCOUNT_FULL' })
  })

  it('returns USER_NOT_WORKSPACE_MEMBER when user not in workspace', async () => {
    const bag = makeBag()
    let calls = 0
    bag.membership = makeWorkspaceMembershipRepoMock({
      findActive: vi.fn().mockImplementation(async () => {
        calls += 1
        // first call = principal (admin); second call = target user (null)
        return calls === 1 ? { role: 'ADMIN', isActive: true } : null
      }),
    })
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1'] },
    )
    expect(r).toEqual({ success: false, code: 'USER_NOT_WORKSPACE_MEMBER' })
  })

  it('returns SHIFT_OVERLAP_CONFLICT with conflicts + alternatives', async () => {
    const bag = makeBag()
    bag.assignment.findOverlappingForUser = vi.fn().mockResolvedValue([
      {
        shiftId: 'other-shift',
        startAt: new Date('2026-07-13T10:00:00Z'),
        endAt: new Date('2026-07-13T18:00:00Z'),
      },
    ])
    bag.assignment.findAlternativeShifts = vi.fn().mockResolvedValue([
      {
        shiftId: 'alt-1',
        scheduleId: 'sch-1',
        startAt: new Date('2026-07-14T08:00:00Z'),
        endAt: new Date('2026-07-14T17:00:00Z'),
        categoryName: 'UTI',
      },
    ])
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1'] },
    )
    expect(r.success).toBe(false)
    if (!r.success && r.code === 'SHIFT_OVERLAP_CONFLICT') {
      expect(r.conflicts).toHaveLength(1)
      expect(r.alternatives).toHaveLength(1)
      expect(r.conflicts[0].userId).toBe('u-1')
    } else {
      throw new Error('expected SHIFT_OVERLAP_CONFLICT')
    }
  })

  it('happy path: assigns 2 users PENDING_ACCEPT + audit per assignment', async () => {
    const bag = makeBag()
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      { workspaceId: WS_ID, shiftId: SHIFT_ID, userIds: ['u-1', 'u-2'] },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toHaveLength(2)
      expect(r.data[0].status).toBe('PENDING_ACCEPT')
    }
    expect(bag.audit.log).toHaveBeenCalledTimes(2)
  })

  it('self-assign: status auto-ACCEPTED + decidedAt set', async () => {
    const bag = makeBag()
    const r = await assignUsersToShift(
      bag.membership,
      bag.schedule,
      bag.shift,
      bag.assignment,
      bag.userSpecialty,
      bag.composition,
      bag.audit,
      principal,
      {
        workspaceId: WS_ID,
        shiftId: SHIFT_ID,
        userIds: [principal.userId], // self
      },
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data[0].status).toBe('ACCEPTED')
      expect(r.data[0].decidedAt).not.toBeNull()
    }
  })
})
