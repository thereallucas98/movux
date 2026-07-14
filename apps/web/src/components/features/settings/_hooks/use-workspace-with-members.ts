'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

export type WorkspaceRole = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'
export type WorkspaceVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

export interface MembershipSpecialty {
  id: string
  slug: string
  name: string
  scope: 'GLOBAL' | 'TENANT' | 'WORKSPACE'
  vertical: string | null
  isActive: boolean
}

export interface WorkspaceWithMembersResponse {
  id: string
  tenantId: string
  name: string
  timezone: string
  vertical: WorkspaceVertical
  isActive: boolean
  createdAt: string
  updatedAt: string
  memberships: Array<{
    id: string
    role: WorkspaceRole
    isActive: boolean
    createdAt: string
    user: {
      id: string
      email: string
      fullName: string
    }
    specialty: MembershipSpecialty | null
  }>
  nextMembershipCursor: string | null
}

async function fetchPage(
  workspaceId: string,
  cursor: string | null,
): Promise<WorkspaceWithMembersResponse> {
  const url = new URL(`/api/workspaces/${workspaceId}`, window.location.origin)
  if (cursor) url.searchParams.set('membersCursor', cursor)
  url.searchParams.set('membersLimit', '20')
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<WorkspaceWithMembersResponse>
}

export function useWorkspaceWithMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchPage(workspaceId, null),
    meta: { silent: true },
  })
}

export function useNextMembersPage(workspaceId: string, cursor: string | null) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'members-page', cursor],
    queryFn: () => fetchPage(workspaceId, cursor),
    enabled: cursor !== null,
    meta: { silent: true },
  })
}
