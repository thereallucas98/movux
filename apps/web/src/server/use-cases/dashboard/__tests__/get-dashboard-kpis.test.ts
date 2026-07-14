import { describe, expect, it, vi } from 'vitest'

import { getDashboardKpis } from '../get-dashboard-kpis.use-case'
import {
  makeAssignmentRepoMock,
  makeRequestRepoMock,
  makeShiftRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const workspaceId = 'ws-1'
const baseInput = {
  workspaceId,
  fromAt: new Date('2026-04-28T03:00:00Z'),
  toAt: new Date('2026-05-06T02:59:59Z'),
}

const activeMembership = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({ role: 'X', isActive: true }),
})

describe('getDashboardKpis', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await getDashboardKpis(
      makeWorkspaceMembershipRepoMock(),
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      makeRequestRepoMock(),
      null,
      baseInput,
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns zero filled stats when no shifts in window', async () => {
    const result = await getDashboardKpis(
      activeMembership,
      makeShiftRepoMock({
        aggregateForWeek: vi
          .fn()
          .mockResolvedValue({ count: 0, totalHeadcount: 0 }),
      }),
      makeAssignmentRepoMock(),
      makeRequestRepoMock(),
      { userId: 'u', role: 'COLABORADOR' },
      baseInput,
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({
      shiftsThisWeek: 0,
      filledTotals: { filled: 0, total: 0 },
      pendingRequests: 0,
    })
  })

  it('uses workspace-scope pending count for COORDENADOR', async () => {
    const requestRepo = makeRequestRepoMock({
      countByWorkspaceAndStatus: vi.fn().mockResolvedValue(7),
      countForUserAndStatus: vi.fn().mockResolvedValue(99),
    })
    const result = await getDashboardKpis(
      activeMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      requestRepo,
      { userId: 'u', role: 'COORDENADOR' },
      baseInput,
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.pendingRequests).toBe(7)
    expect(requestRepo.countByWorkspaceAndStatus).toHaveBeenCalled()
    expect(requestRepo.countForUserAndStatus).not.toHaveBeenCalled()
  })

  it('uses user-scope pending count for COLABORADOR', async () => {
    const requestRepo = makeRequestRepoMock({
      countByWorkspaceAndStatus: vi.fn().mockResolvedValue(99),
      countForUserAndStatus: vi.fn().mockResolvedValue(2),
    })
    const result = await getDashboardKpis(
      activeMembership,
      makeShiftRepoMock(),
      makeAssignmentRepoMock(),
      requestRepo,
      { userId: 'u', role: 'COLABORADOR' },
      baseInput,
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.pendingRequests).toBe(2)
    expect(requestRepo.countForUserAndStatus).toHaveBeenCalled()
    expect(requestRepo.countByWorkspaceAndStatus).not.toHaveBeenCalled()
  })
})
