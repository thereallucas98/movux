import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type {
  WorkspaceRepository,
  WorkspaceWithMembers,
} from '~/server/repositories/workspace.repository'

import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetWorkspaceByIdInput {
  workspaceId: string
  membersCursor?: string | null
  membersLimit?: number
}

export type GetWorkspaceByIdResult =
  | { success: true; data: WorkspaceWithMembers }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function getWorkspaceById(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  principal: Principal | null,
  input: GetWorkspaceByIdInput,
): Promise<GetWorkspaceByIdResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (auth.membership.role === 'ADMIN') {
    const data = await workspaceRepo.findByIdWithMembersPage(
      input.workspaceId,
      input.membersCursor ?? null,
      input.membersLimit ?? 20,
    )
    if (!data) return { success: false, code: 'NOT_FOUND' }

    // Enrich each membership row with the member's current specialty.
    const userIds = data.memberships.map((m) => m.user.id)
    if (userIds.length > 0) {
      const userSpecialties =
        await userSpecialtyRepo.listActiveByWorkspaceForUsers(
          input.workspaceId,
          userIds,
        )
      const byUserId = new Map(
        userSpecialties.map((u) => [u.userId, u.specialty]),
      )
      data.memberships = data.memberships.map((m) => {
        const s = byUserId.get(m.user.id)
        return {
          ...m,
          specialty: s
            ? {
                id: s.id,
                slug: s.slug,
                name: s.name,
                scope: s.scope,
                vertical: s.vertical,
                isActive: true,
              }
            : null,
        }
      })
    }

    return { success: true, data }
  }

  const workspace = await workspaceRepo.findById(input.workspaceId)
  if (!workspace) return { success: false, code: 'NOT_FOUND' }

  return {
    success: true,
    data: {
      ...workspace,
      memberships: [],
      nextMembershipCursor: null,
    },
  }
}
