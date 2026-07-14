import { describe, expect, it, vi } from 'vitest'

import { getWorkspaceMemberDetail } from '../get-workspace-member-detail.use-case'
import {
  makeUserRepoMock,
  makeUserSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'caller-1', role: 'USER' }
const WS_ID = 'ws-1'
const MEMBER_ID = 'mem-1'
const TARGET_USER_ID = 'target-user-1'

function activeMembershipRepo() {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role: 'ADMIN', isActive: true }),
    findById: vi.fn().mockResolvedValue({
      id: MEMBER_ID,
      workspaceId: WS_ID,
      userId: TARGET_USER_ID,
      role: 'COLABORADOR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  })
}

const userRow = {
  id: TARGET_USER_ID,
  fullName: 'Target User',
  email: 't@movux.test',
  role: 'USER',
  isActive: true,
  emailVerified: true,
  phone: null,
  avatarUrl: 'https://avatar.example/t.png',
  dateOfBirth: null,
  bio: null,
  whatsappOptIn: false,
  emergencyContactName: null,
  emergencyContactPhone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('getWorkspaceMemberDetail', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await getWorkspaceMemberDetail(
      makeWorkspaceMembershipRepoMock(),
      makeUserSpecialtyRepoMock(),
      makeUserRepoMock(),
      null,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not an active member', async () => {
    const result = await getWorkspaceMemberDetail(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeUserSpecialtyRepoMock(),
      makeUserRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns TARGET_MEMBER_NOT_FOUND when member missing', async () => {
    const result = await getWorkspaceMemberDetail(
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
        findById: vi.fn().mockResolvedValue(null),
      }),
      makeUserSpecialtyRepoMock(),
      makeUserRepoMock(),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result).toEqual({ success: false, code: 'TARGET_MEMBER_NOT_FOUND' })
  })

  it('returns detail with null specialty when user has none assigned', async () => {
    const result = await getWorkspaceMemberDetail(
      activeMembershipRepo(),
      makeUserSpecialtyRepoMock({
        findActiveByMemberWithSpecialty: vi.fn().mockResolvedValue(null),
      }),
      makeUserRepoMock({
        findByIdForMe: vi.fn().mockResolvedValue(userRow),
      }),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.specialty).toBeNull()
      expect(result.data.user.avatarUrl).toBe('https://avatar.example/t.png')
    }
  })

  it('returns detail with specialty when assigned', async () => {
    const result = await getWorkspaceMemberDetail(
      activeMembershipRepo(),
      makeUserSpecialtyRepoMock({
        findActiveByMemberWithSpecialty: vi.fn().mockResolvedValue({
          id: 'us-1',
          userId: TARGET_USER_ID,
          workspaceId: WS_ID,
          specialtyId: 'sp-1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          specialty: {
            id: 'sp-1',
            scope: 'WORKSPACE',
            vertical: null,
            slug: 'custom',
            name: 'Custom',
            description: null,
          },
        }),
      }),
      makeUserRepoMock({
        findByIdForMe: vi.fn().mockResolvedValue(userRow),
      }),
      principal,
      { workspaceId: WS_ID, memberId: MEMBER_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.specialty?.name).toBe('Custom')
    }
  })
})
