import { describe, expect, it, vi } from 'vitest'

import {
  assertAdminOrCoordenadorOfWorkspace,
  type WorkspaceMembershipLookup,
} from '../assert-admin-or-coordenador-of-workspace'
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

describe('assertAdminOrCoordenadorOfWorkspace', () => {
  const principal: Principal = { userId: USER_ID, role: 'USER' }

  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await assertAdminOrCoordenadorOfWorkspace(
      makeRepo(null),
      null,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when no membership is found', async () => {
    const result = await assertAdminOrCoordenadorOfWorkspace(
      makeRepo(null),
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns FORBIDDEN when membership is inactive', async () => {
    const result = await assertAdminOrCoordenadorOfWorkspace(
      makeRepo({ role: 'ADMIN', isActive: false }),
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })

  it('returns authorized for active ADMIN', async () => {
    const result = await assertAdminOrCoordenadorOfWorkspace(
      makeRepo({ role: 'ADMIN', isActive: true }),
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: true })
  })

  it('returns authorized for active COORDENADOR', async () => {
    const result = await assertAdminOrCoordenadorOfWorkspace(
      makeRepo({ role: 'COORDENADOR', isActive: true }),
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: true })
  })

  it('returns FORBIDDEN for active COLABORADOR', async () => {
    const result = await assertAdminOrCoordenadorOfWorkspace(
      makeRepo({ role: 'COLABORADOR', isActive: true }),
      principal,
      WORKSPACE_ID,
    )
    expect(result).toEqual({ authorized: false, code: 'FORBIDDEN' })
  })
})
