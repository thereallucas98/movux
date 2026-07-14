import { describe, expect, it, vi } from 'vitest'

import { getWorkspaceById } from '../get-workspace-by-id.use-case'
import {
  makeUserSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }
const WS_ID = 'ws-1'

const workspaceRow = {
  id: WS_ID,
  tenantId: 't-1',
  name: 'Hospital',
  timezone: 'America/Sao_Paulo',
  vertical: 'HOSPITAL',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('getWorkspaceById', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await getWorkspaceById(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeUserSpecialtyRepoMock(),
      null,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller has no membership', async () => {
    const result = await getWorkspaceById(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeUserSpecialtyRepoMock(),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns full workspace + memberships for ADMIN', async () => {
    const withMembers = {
      ...workspaceRow,
      memberships: [
        {
          id: 'm-1',
          role: 'ADMIN',
          isActive: true,
          user: { id: 'user-1', email: 'a@b.c', fullName: 'A' },
          specialty: null,
        },
      ],
      nextMembershipCursor: null,
    }
    const repo = makeWorkspaceRepoMock({
      findByIdWithMembersPage: vi.fn().mockResolvedValue(withMembers),
    })
    const result = await getWorkspaceById(
      repo,
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      makeUserSpecialtyRepoMock(),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.memberships).toHaveLength(1)
      expect(result.data.memberships[0].specialty).toBeNull()
    }
  })

  it('enriches memberships with specialty when bulk lookup returns rows', async () => {
    const withMembers = {
      ...workspaceRow,
      memberships: [
        {
          id: 'm-1',
          role: 'ADMIN',
          isActive: true,
          user: { id: 'user-1', email: 'a@b.c', fullName: 'A' },
          specialty: null,
        },
      ],
      nextMembershipCursor: null,
    }
    const repo = makeWorkspaceRepoMock({
      findByIdWithMembersPage: vi.fn().mockResolvedValue(withMembers),
    })
    const userSpecialtyRepo = makeUserSpecialtyRepoMock({
      listActiveByWorkspaceForUsers: vi.fn().mockResolvedValue([
        {
          id: 'us-1',
          userId: 'user-1',
          workspaceId: WS_ID,
          specialtyId: 'sp-1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          specialty: {
            id: 'sp-1',
            scope: 'WORKSPACE' as const,
            vertical: null,
            slug: 'enfermeiro',
            name: 'Enfermeiro',
            description: null,
          },
        },
      ]),
    })
    const result = await getWorkspaceById(
      repo,
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      userSpecialtyRepo,
      principal,
      { workspaceId: WS_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.memberships[0].specialty).toMatchObject({
        id: 'sp-1',
        slug: 'enfermeiro',
        name: 'Enfermeiro',
      })
    }
  })

  it('returns workspace only (empty memberships) for COLABORADOR', async () => {
    const repo = makeWorkspaceRepoMock({
      findById: vi.fn().mockResolvedValue(workspaceRow),
    })
    const result = await getWorkspaceById(
      repo,
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
      }),
      makeUserSpecialtyRepoMock(),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.memberships).toEqual([])
      expect(result.data.nextMembershipCursor).toBeNull()
    }
    expect(repo.findByIdWithMembersPage).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND when workspace was soft-deleted after auth', async () => {
    const repo = makeWorkspaceRepoMock({
      findByIdWithMembersPage: vi.fn().mockResolvedValue(null),
    })
    const result = await getWorkspaceById(
      repo,
      makeWorkspaceMembershipRepoMock({
        findActive: vi
          .fn()
          .mockResolvedValue({ role: 'ADMIN', isActive: true }),
      }),
      makeUserSpecialtyRepoMock(),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })
})
