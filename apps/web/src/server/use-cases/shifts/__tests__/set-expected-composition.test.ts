import { describe, expect, it, vi } from 'vitest'

import { setExpectedComposition } from '../set-expected-composition.use-case'
import {
  makeAuditRepoMock,
  makeScheduleRepoMock,
  makeShiftCompositionRepoMock,
  makeShiftRepoMock,
  makeSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const principal = { userId: 'user-1', role: 'USER' }

const adminMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
})

const shift = {
  id: 'shift-1',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  patternId: null,
  startAt: new Date(),
  endAt: new Date(),
  headcount: 1,
  status: 'OPEN' as const,
  notes: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

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

describe('setExpectedComposition', () => {
  it('returns INVALID_STATE_TRANSITION when schedule is PUBLISHED', async () => {
    const r = await setExpectedComposition(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...draftSchedule, status: 'PUBLISHED' }),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(shift) }),
      makeSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1', items: [{ specialtyId: 'sp-1', count: 2 }] },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('returns SPECIALTY_NOT_IN_WORKSPACE when specialty unavailable', async () => {
    const r = await setExpectedComposition(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(shift) }),
      makeSpecialtyRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue(null),
      }),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      { shiftId: 'shift-1', items: [{ specialtyId: 'sp-1', count: 2 }] },
    )
    expect(r).toEqual({ success: false, code: 'SPECIALTY_NOT_IN_WORKSPACE' })
  })

  it('returns VALIDATION_ERROR for duplicate specialtyId', async () => {
    const r = await setExpectedComposition(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(shift) }),
      makeSpecialtyRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: 'sp-1' }),
      }),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        shiftId: 'shift-1',
        items: [
          { specialtyId: 'sp-1', count: 1 },
          { specialtyId: 'sp-1', count: 2 },
        ],
      },
    )
    expect(r).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('replaces composition + audit on happy path', async () => {
    const deleteMock = vi.fn()
    const createManyMock = vi.fn().mockResolvedValue({ count: 1 })
    const findMock = vi.fn().mockResolvedValue([
      {
        id: 'c-1',
        shiftId: 'shift-1',
        specialtyId: 'sp-1',
        count: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    const auditRepo = makeAuditRepoMock()
    const r = await setExpectedComposition(
      adminMembership,
      makeScheduleRepoMock({
        findById: vi.fn().mockResolvedValue(draftSchedule),
      }),
      makeShiftRepoMock({ findById: vi.fn().mockResolvedValue(shift) }),
      makeSpecialtyRepoMock({
        findAvailableForWorkspace: vi.fn().mockResolvedValue({ id: 'sp-1' }),
      }),
      makeShiftCompositionRepoMock({
        deleteAllForShift: deleteMock,
        createMany: createManyMock,
        findByShift: findMock,
      }),
      auditRepo,
      principal,
      { shiftId: 'shift-1', items: [{ specialtyId: 'sp-1', count: 2 }] },
    )
    expect(r.success).toBe(true)
    expect(deleteMock).toHaveBeenCalled()
    expect(createManyMock).toHaveBeenCalled()
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SHIFT_COMPOSITION_SET' }),
      expect.any(Object),
    )
  })
})
