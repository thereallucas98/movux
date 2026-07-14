import { describe, expect, it, vi } from 'vitest'

import { assertShiftParticipantOrCoord } from '../assert-shift-participant-or-coord'
import {
  makeAssignmentRepoMock,
  makeCandidateRepoMock,
  makeRequestRepoMock,
  makeScheduleRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../use-cases/__tests__/helpers'

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

function buildRepos(
  overrides: {
    membership?: ReturnType<typeof makeWorkspaceMembershipRepoMock>
    assignment?: ReturnType<typeof makeAssignmentRepoMock>
    candidate?: ReturnType<typeof makeCandidateRepoMock>
    request?: ReturnType<typeof makeRequestRepoMock>
    shift?: ReturnType<typeof makeShiftRepoMock>
    schedule?: ReturnType<typeof makeScheduleRepoMock>
  } = {},
) {
  return {
    workspaceMembershipRepo:
      overrides.membership ??
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
    shiftRepo:
      overrides.shift ??
      makeShiftRepoMock({
        findById: vi.fn().mockResolvedValue(baseShift),
      }),
    scheduleRepo:
      overrides.schedule ??
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(baseSchedule),
      }),
    assignmentRepo: overrides.assignment ?? makeAssignmentRepoMock(),
    shiftCandidateRepo: overrides.candidate ?? makeCandidateRepoMock(),
    requestRepo: overrides.request ?? makeRequestRepoMock(),
  }
}

describe('assertShiftParticipantOrCoord', () => {
  it('UNAUTHENTICATED when no principal', async () => {
    const r = await assertShiftParticipantOrCoord(buildRepos(), null, SHIFT_ID)
    expect(r).toEqual({ authorized: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when shift is missing', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos({
        shift: makeShiftRepoMock({
          findById: vi.fn().mockResolvedValue(null),
        }),
      }),
      principal,
      SHIFT_ID,
    )
    expect(r).toEqual({ authorized: false, code: 'NOT_FOUND' })
  })

  it('NOT_FOUND when caller is not a workspace member (outsider)', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos({
        membership: makeWorkspaceMembershipRepoMock({
          findActive: vi.fn().mockResolvedValue(null),
        }),
      }),
      principal,
      SHIFT_ID,
    )
    expect(r).toEqual({ authorized: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when caller is a workspace member but not participant', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos(),
      principal,
      SHIFT_ID,
    )
    expect(r).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('authorized as COORD for ADMIN role', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos({
        membership: makeWorkspaceMembershipRepoMock({
          findActive: vi
            .fn()
            .mockResolvedValue({ role: 'ADMIN', isActive: true }),
        }),
      }),
      principal,
      SHIFT_ID,
    )
    expect(r).toMatchObject({ authorized: true, reason: 'COORD' })
  })

  it('authorized as COORD for COORDENADOR role', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos({
        membership: makeWorkspaceMembershipRepoMock({
          findActive: vi
            .fn()
            .mockResolvedValue({ role: 'COORDENADOR', isActive: true }),
        }),
      }),
      principal,
      SHIFT_ID,
    )
    expect(r).toMatchObject({ authorized: true, reason: 'COORD' })
  })

  it('authorized as PARTICIPANT when caller has an active assignment', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos({
        assignment: makeAssignmentRepoMock({
          findActiveOnShiftForUser: vi.fn().mockResolvedValue({
            id: 'asg-1',
            shiftId: SHIFT_ID,
            userId: principal.userId,
          }),
        }),
      }),
      principal,
      SHIFT_ID,
    )
    expect(r).toMatchObject({ authorized: true, reason: 'PARTICIPANT' })
  })

  it('authorized as PARTICIPANT when caller is a candidate', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos({
        candidate: makeCandidateRepoMock({
          findActiveByShiftAndUser: vi.fn().mockResolvedValue({ id: 'cand-1' }),
        }),
      }),
      principal,
      SHIFT_ID,
    )
    expect(r).toMatchObject({ authorized: true, reason: 'PARTICIPANT' })
  })

  it('authorized as PARTICIPANT when caller is a swap target', async () => {
    const r = await assertShiftParticipantOrCoord(
      buildRepos({
        request: makeRequestRepoMock({
          findSwapTargetForShift: vi.fn().mockResolvedValue({ id: 'req-1' }),
        }),
      }),
      principal,
      SHIFT_ID,
    )
    expect(r).toMatchObject({ authorized: true, reason: 'PARTICIPANT' })
  })
})
