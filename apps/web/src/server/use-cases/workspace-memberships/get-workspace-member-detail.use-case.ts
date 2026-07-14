import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  MembershipRow,
  WorkspaceMembershipRepository,
} from '~/server/repositories/workspace-membership.repository'
import type {
  UserSpecialtyRepository,
  UserSpecialtyWithSpecialty,
} from '~/server/repositories/user-specialty.repository'
import type { UserRepository } from '~/server/repositories/user.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetWorkspaceMemberDetailInput {
  workspaceId: string
  memberId: string
}

export interface MemberDetail {
  membership: MembershipRow
  user: {
    id: string
    fullName: string
    email: string
    avatarUrl: string | null
  }
  specialty: UserSpecialtyWithSpecialty['specialty'] | null
}

export type GetWorkspaceMemberDetailResult =
  | { success: true; data: MemberDetail }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'TARGET_MEMBER_NOT_FOUND'
    }

export async function getWorkspaceMemberDetail(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  userRepo: UserRepository,
  principal: Principal | null,
  input: GetWorkspaceMemberDetailInput,
): Promise<GetWorkspaceMemberDetailResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const membership = await workspaceMembershipRepo.findById(input.memberId)
  if (
    !membership ||
    membership.workspaceId !== input.workspaceId ||
    !membership.isActive
  ) {
    return { success: false, code: 'TARGET_MEMBER_NOT_FOUND' }
  }

  const user = await userRepo.findByIdForMe(membership.userId)
  if (!user) {
    return { success: false, code: 'TARGET_MEMBER_NOT_FOUND' }
  }

  const userSpec = await userSpecialtyRepo.findActiveByMemberWithSpecialty({
    userId: membership.userId,
    workspaceId: input.workspaceId,
  })

  return {
    success: true,
    data: {
      membership,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      specialty: userSpec?.specialty ?? null,
    },
  }
}
