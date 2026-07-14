import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  AssignmentRepository,
  AssignmentStatus,
  AssignmentWithShiftRow,
} from '~/server/repositories/assignment.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListAssignmentsForUserInWorkspaceInput {
  workspaceId: string
  userId: string
  statuses: AssignmentStatus[]
}

export type ListAssignmentsForUserInWorkspaceResult =
  | { success: true; data: AssignmentWithShiftRow[] }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listAssignmentsForUserInWorkspace(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  principal: Principal | null,
  input: ListAssignmentsForUserInWorkspaceInput,
): Promise<ListAssignmentsForUserInWorkspaceResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const data = await assignmentRepo.listForUserInWorkspace(
    input.userId,
    input.workspaceId,
    input.statuses,
  )
  return { success: true, data }
}
