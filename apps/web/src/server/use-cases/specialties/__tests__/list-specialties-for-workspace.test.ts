import { describe, expect, it, vi } from 'vitest'

import { listSpecialtiesForWorkspace } from '../list-specialties-for-workspace.use-case'
import {
  makeSpecialtyRepoMock,
  makeWorkspaceMembershipRepoMock,
  makeWorkspaceRepoMock,
} from '../../__tests__/helpers'

const principal = { userId: 'user-1', role: 'USER' }
const WS_ID = 'ws-1'

const workspaceRow = {
  id: WS_ID,
  tenantId: 't-1',
  name: 'WS',
  timezone: 'UTC',
  vertical: 'HOSPITAL',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function activeMembershipRepo(role = 'COLABORADOR') {
  return makeWorkspaceMembershipRepoMock({
    findActive: vi.fn().mockResolvedValue({ role, isActive: true }),
  })
}

describe('listSpecialtiesForWorkspace', () => {
  it('returns UNAUTHENTICATED when principal is null', async () => {
    const result = await listSpecialtiesForWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock(),
      makeSpecialtyRepoMock(),
      null,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when caller is not an active member', async () => {
    const result = await listSpecialtiesForWorkspace(
      makeWorkspaceRepoMock(),
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeSpecialtyRepoMock(),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('returns NOT_FOUND when workspace is soft-deleted', async () => {
    const result = await listSpecialtiesForWorkspace(
      makeWorkspaceRepoMock({ findById: vi.fn().mockResolvedValue(null) }),
      activeMembershipRepo(),
      makeSpecialtyRepoMock({
        listGlobal: vi.fn().mockResolvedValue([]),
        listTenant: vi.fn().mockResolvedValue([]),
        listWorkspace: vi.fn().mockResolvedValue([]),
      }),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('returns empty list when no specialties exist', async () => {
    const result = await listSpecialtiesForWorkspace(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      activeMembershipRepo(),
      makeSpecialtyRepoMock({
        listGlobal: vi.fn().mockResolvedValue([]),
        listTenant: vi.fn().mockResolvedValue([]),
        listWorkspace: vi.fn().mockResolvedValue([]),
      }),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([])
  })

  it('merges with override WORKSPACE > TENANT > GLOBAL by slug', async () => {
    const baseRow = {
      id: '',
      scope: '',
      vertical: null,
      tenantId: null,
      workspaceId: null,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await listSpecialtiesForWorkspace(
      makeWorkspaceRepoMock({
        findById: vi.fn().mockResolvedValue(workspaceRow),
      }),
      activeMembershipRepo('ADMIN'),
      makeSpecialtyRepoMock({
        listGlobal: vi.fn().mockResolvedValue([
          {
            ...baseRow,
            id: 'g1',
            scope: 'GLOBAL',
            vertical: 'HOSPITAL',
            slug: 'nurse',
            name: 'Enfermeiro GLOBAL',
          },
          {
            ...baseRow,
            id: 'g2',
            scope: 'GLOBAL',
            vertical: 'HOSPITAL',
            slug: 'doctor',
            name: 'Médico(a)',
          },
        ]),
        listTenant: vi.fn().mockResolvedValue([
          {
            ...baseRow,
            id: 't1',
            scope: 'TENANT',
            tenantId: 't-1',
            slug: 'nurse',
            name: 'Enfermeiro TENANT',
          },
        ]),
        listWorkspace: vi.fn().mockResolvedValue([
          {
            ...baseRow,
            id: 'w1',
            scope: 'WORKSPACE',
            tenantId: 't-1',
            workspaceId: WS_ID,
            slug: 'nurse',
            name: 'Enfermeiro CUSTOM',
          },
        ]),
      }),
      principal,
      { workspaceId: WS_ID },
    )
    expect(result.success).toBe(true)
    if (result.success) {
      const nurse = result.data.find((s) => s.slug === 'nurse')
      expect(nurse?.source).toBe('WORKSPACE')
      expect(nurse?.name).toBe('Enfermeiro CUSTOM')
      const doctor = result.data.find((s) => s.slug === 'doctor')
      expect(doctor?.source).toBe('GLOBAL')
      expect(result.data).toHaveLength(2)
    }
  })
})
