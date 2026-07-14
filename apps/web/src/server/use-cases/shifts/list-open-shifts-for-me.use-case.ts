import type {
  OpenShiftForUserRow,
  ShiftRepository,
} from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export type ListOpenShiftsForMeResult =
  | { success: true; data: OpenShiftForUserRow[] }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function listOpenShiftsForMe(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  principal: Principal | null,
): Promise<ListOpenShiftsForMeResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const memberships = await workspaceMembershipRepo.listActiveByUser(
    principal.userId,
  )
  const workspaceIds = memberships.map((m) => m.workspaceId)
  if (workspaceIds.length === 0) {
    return { success: true, data: [] }
  }

  const data = await shiftRepo.listOpenForUser(principal.userId, workspaceIds)
  return { success: true, data }
}
