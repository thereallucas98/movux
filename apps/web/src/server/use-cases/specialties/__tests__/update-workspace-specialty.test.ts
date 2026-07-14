import { describe, expect, it, vi } from 'vitest'

import { updateWorkspaceSpecialty } from '../update-workspace-specialty.use-case'
import {
  makeAuditRepoMock,
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
const WS_ID = 'ws-1'
const SP_ID = 'sp-1'

function adminMembershipRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
  })
}

const wsScopedSpecialty = {
  id: SP_ID,
  scope: 'WORKSPACE',
  vertical: null,
  tenantId: 't-1',
  workspaceId: WS_ID,
  slug: 'custom',
  name: 'Old',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('updateWorkspaceSpecialty', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await updateWorkspaceSpecialty(
      makeWorkspaceMembershipRepoMock(),
      makeSpecialtyRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, specialtyId: SP_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await updateWorkspaceSpecialty(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeSpecialtyRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when target is GLOBAL-scope', async () => {
    const result = await updateWorkspaceSpecialty(
      adminMembershipRepo(),
      makeSpecialtyRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedSpecialty, scope: 'GLOBAL' }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns NOT_FOUND when target belongs to a different workspace', async () => {
    const result = await updateWorkspaceSpecialty(
      adminMembershipRepo(),
      makeSpecialtyRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedSpecialty, workspaceId: 'other' }),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID, data: { name: 'New' } },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('updates specialty and writes audit on happy path', async () => {
    const updated = { ...wsScopedSpecialty, name: 'Renamed' }
    const specialtyRepo = makeSpecialtyRepoMock({
      findById: vi.fn().mockResolvedValue(wsScopedSpecialty),
      update: vi.fn().mockResolvedValue(updated),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await updateWorkspaceSpecialty(
      adminMembershipRepo(),
      specialtyRepo,
      auditRepo,
      principal,
      {
        workspaceId: WS_ID,
        specialtyId: SP_ID,
        data: { name: 'Renamed' },
      },
    )
    expect(result.success).toBe(true)
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_SPECIALTY_UPDATED',
        entityId: SP_ID,
      }),
      expect.any(Object),
    )
  })
})
