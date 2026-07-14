import { describe, expect, it, vi } from 'vitest'

import { softDeleteWorkspaceSpecialty } from '../soft-delete-workspace-specialty.use-case'
import {
  makeAuditRepoMock,
  makeShiftCompositionRepoMock,
  makeSpecialtyRepoMock,
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
  name: 'Custom',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('softDeleteWorkspaceSpecialty', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await softDeleteWorkspaceSpecialty(
      makeWorkspaceMembershipRepoMock(),
      makeSpecialtyRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      null,
      { workspaceId: WS_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not ADMIN', async () => {
    const result = await softDeleteWorkspaceSpecialty(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeSpecialtyRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when target is GLOBAL-scope', async () => {
    const result = await softDeleteWorkspaceSpecialty(
      adminMembershipRepo(),
      makeSpecialtyRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedSpecialty, scope: 'GLOBAL' }),
      }),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns NOT_FOUND when target belongs to another workspace', async () => {
    const result = await softDeleteWorkspaceSpecialty(
      adminMembershipRepo(),
      makeSpecialtyRepoMock({
        findById: vi
          .fn()
          .mockResolvedValue({ ...wsScopedSpecialty, workspaceId: 'other' }),
      }),
      makeUserSpecialtyRepoMock(),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns CANNOT_DELETE_IN_USE when active UserSpecialty rows reference it', async () => {
    const result = await softDeleteWorkspaceSpecialty(
      adminMembershipRepo(),
      makeSpecialtyRepoMock({
        findById: vi.fn().mockResolvedValue(wsScopedSpecialty),
      }),
      makeUserSpecialtyRepoMock({
        countActiveBySpecialty: vi.fn().mockResolvedValue(3),
      }),
      makeShiftCompositionRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'CANNOT_DELETE_IN_USE' })
  })

  it('returns CANNOT_DELETE_IN_USE when ShiftExpectedComposition references it', async () => {
    const result = await softDeleteWorkspaceSpecialty(
      adminMembershipRepo(),
      makeSpecialtyRepoMock({
        findById: vi.fn().mockResolvedValue(wsScopedSpecialty),
      }),
      makeUserSpecialtyRepoMock({
        countActiveBySpecialty: vi.fn().mockResolvedValue(0),
      }),
      makeShiftCompositionRepoMock({
        countActiveBySpecialty: vi.fn().mockResolvedValue(2),
      }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: false, code: 'CANNOT_DELETE_IN_USE' })
  })

  it('soft-deletes specialty and writes audit on happy path (0 refs anywhere)', async () => {
    const specialtyRepo = makeSpecialtyRepoMock({
      findById: vi.fn().mockResolvedValue(wsScopedSpecialty),
    })
    const userSpecialtyRepo = makeUserSpecialtyRepoMock({
      countActiveBySpecialty: vi.fn().mockResolvedValue(0),
    })
    const compositionRepo = makeShiftCompositionRepoMock({
      countActiveBySpecialty: vi.fn().mockResolvedValue(0),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await softDeleteWorkspaceSpecialty(
      adminMembershipRepo(),
      specialtyRepo,
      userSpecialtyRepo,
      compositionRepo,
      auditRepo,
      principal,
      { workspaceId: WS_ID, specialtyId: SP_ID },
    )
    expect(result).toEqual({ success: true })
    expect(specialtyRepo.softDelete).toHaveBeenCalledWith(
      SP_ID,
      expect.any(Object),
    )
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WORKSPACE_SPECIALTY_DELETED',
        entityId: SP_ID,
      }),
      expect.any(Object),
    )
  })
})
