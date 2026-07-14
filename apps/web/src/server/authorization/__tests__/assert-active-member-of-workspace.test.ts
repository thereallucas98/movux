import { describe, expect, it, vi } from 'vitest'

import {
  assertActiveMemberOfWorkspace,
  type WorkspaceMembershipLookup,
} from '../assert-active-member-of-workspace'
import type { Principal } from '../assert-super-admin-of-tenant'

const WORKSPACE_ID = 'workspace-1'
const USER_ID = 'user-1'

function makeRepo(
  returnValue: { role: string; isActive: boolean } | null,
): WorkspaceMembershipLookup {
  return {
    findActive: vi.fn().mockResolvedValue(returnValue),
  }
}

describe('assertActiveMemberOfWorkspace', () => {
  const principal: Principal = { userId: USER_ID, role: 'USER' }

  it('returns UNAUTHENTICATED when principal is null', async () => {
    const repo = makeRepo(null)
    const result = await assertActiveMemberOfWorkspace(repo, null, WORKSPACE_ID)
    expect(result).toEqual({ authorized: false, code: 'UNAUTHENTICATED' })
    expect(repo.findActive).not.toHaveBeenCalled()
  })

  it('returns FORBIDDEN when no membership is found', async () => {
    const repo = makeRepo(null)
    const result = await assertActiveMemberOfWorkspace(
      repo,
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns FORBIDDEN when membership is inactive', async () => {
    const repo = makeRepo({ role: 'ADMIN', isActive: false })
    const result = await assertActiveMemberOfWorkspace(
      repo,
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns authorized + membership for active ADMIN', async () => {
    const membership = { role: 'ADMIN', isActive: true }
    const repo = makeRepo(membership)
    const result = await assertActiveMemberOfWorkspace(
      repo,
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: true, membership })
  })

  it('returns authorized + membership for active COORDENADOR', async () => {
    const membership = { role: 'COORDENADOR', isActive: true }
    const repo = makeRepo(membership)
    const result = await assertActiveMemberOfWorkspace(
      repo,
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: true, membership })
  })

  it('returns authorized + membership for active COLABORADOR', async () => {
    const membership = { role: 'COLABORADOR', isActive: true }
    const repo = makeRepo(membership)
    const result = await assertActiveMemberOfWorkspace(
      repo,
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: true, membership })
  })
})
