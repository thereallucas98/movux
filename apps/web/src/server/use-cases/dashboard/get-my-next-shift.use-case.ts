import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'

import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetMyNextShiftInput {
  workspaceId: string
}

export interface MyNextShift {
  assignmentId: string
  shiftId: string
  scheduleId: string
  categoryId: string
  startAt: Date
  endAt: Date
}

export type GetMyNextShiftResult =
  | { success: true; data: MyNextShift | null }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function getMyNextShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  principal: Principal | null,
  input: GetMyNextShiftInput,
): Promise<GetMyNextShiftResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  const principalUserId = (principal as Principal).userId
  const row = await assignmentRepo.findMyNextAcceptedInWorkspace({
    userId: principalUserId,
    workspaceId: input.workspaceId,
    now: new Date(),
  })
  if (!row) return { success: true, data: null }

  return {
    success: true,
    data: {
      assignmentId: row.id,
      shiftId: row.shiftId,
      scheduleId: row.scheduleId,
      categoryId: row.categoryId,
      startAt: row.startAt,
      endAt: row.endAt,
    },
  }
}
