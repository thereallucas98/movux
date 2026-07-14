import { describe, expect, it, vi } from 'vitest'

import { listUpcomingShifts } from '../list-upcoming-shifts.use-case'
import {
  makeAssignmentRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'COLABORADOR' }
const workspaceId = 'ws-1'
const fromAt = new Date('2026-04-28T03:00:00Z')
const toAt = new Date('2026-05-06T02:59:59Z')

const baseInput = { workspaceId, fromAt, toAt, limit: 5 }

const sampleShift = {
  id: 'shift-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date('2026-04-29T10:00:00Z'),
  endAt: new Date('2026-04-29T18:00:00Z'),
  headcount: 4,
  status: 'OPEN' as const,
  assignmentMode: 'DIRECT_ASSIGN' as const,
  decisionWindowHours: 48,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  categoryName: 'UTI',
}

describe('listUpcomingShifts', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await listUpcomingShifts(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      null,
      baseInput,
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not an active member', async () => {
    const memberships = makeWorkspaceMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const result = await listUpcomingShifts(
      memberships,
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      principal,
      baseInput,
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns empty data when no shifts are in the window', async () => {
    const memberships = makeWorkspaceMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
    })
    const shiftRepo = makeShiftRepoMock({
      listUpcomingForWorkspace: vi.fn().mockResolvedValue([]),
    })
    const result = await listUpcomingShifts(
      memberships,
      shiftRepo,
      makeAssignmentRepoMock(),
      principal,
      baseInput,
    )
    expect(result).toEqual({ success: true, data: [] })
  })

  it('stitches filled counts onto each shift', async () => {
    const memberships = makeWorkspaceMembershipRepoMock({
      findActive: vi
        .fn()
        .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
    })
    const shiftRepo = makeShiftRepoMock({
      listUpcomingForWorkspace: vi.fn().mockResolvedValue([sampleShift]),
    })
    const assignmentRepo = makeAssignmentRepoMock({
      countActiveByShiftIds: vi
        .fn()
        .mockResolvedValue(new Map([['shift-1', 3]])),
    })
    const result = await listUpcomingShifts(
      memberships,
      shiftRepo,
      assignmentRepo,
      principal,
      baseInput,
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({
      id: 'shift-1',
      categoryName: 'UTI',
      headcount: 4,
      filled: 3,
    })
  })
})
