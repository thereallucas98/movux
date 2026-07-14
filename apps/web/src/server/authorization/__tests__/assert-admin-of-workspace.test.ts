import { describe, expect, it, vi } from 'vitest'

import {
  assertAdminOfWorkspace,
  type WorkspaceMembershipLookup,
} from '../assert-admin-of-workspace'
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

describe('assertAdminOfWorkspace', () => {
  const principal: Principal = { userId: USER_ID, role: 'USER' }

  it('returns UNAUTHENTICATED when principal is null', async () => {
    const repo = makeRepo(null)
    const result = await assertAdminOfWorkspace(repo, null, WORKSPACE_ID)
    expect(result).toEqual({ authorized: false, code: 'UNAUTHENTICATED' })
    expect(repo.findActive).not.toHaveBeenCalled()
  })

  it('returns FORBIDDEN when no membership is found', async () => {
    const repo = makeRepo(null)
    const result = await assertAdminOfWorkspace(repo, principal, WORKSPACE_ID)
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
    expect(repo.findActive).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    })
  })

  it('returns FORBIDDEN when membership is inactive', async () => {
    const repo = makeRepo({ role: 'ADMIN', isActive: false })
    const result = await assertAdminOfWorkspace(repo, principal, WORKSPACE_ID)
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns FORBIDDEN when role is COORDENADOR', async () => {
    const repo = makeRepo({ role: 'COORDENADOR', isActive: true })
    const result = await assertAdminOfWorkspace(repo, principal, WORKSPACE_ID)
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns FORBIDDEN when role is COLABORADOR', async () => {
    const repo = makeRepo({ role: 'COLABORADOR', isActive: true })
    const result = await assertAdminOfWorkspace(repo, principal, WORKSPACE_ID)
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns authorized when principal has active ADMIN membership', async () => {
    const repo = makeRepo({ role: 'ADMIN', isActive: true })
    const result = await assertAdminOfWorkspace(repo, principal, WORKSPACE_ID)
    expect(result).toEqual({ authorized: true })
  })
})
