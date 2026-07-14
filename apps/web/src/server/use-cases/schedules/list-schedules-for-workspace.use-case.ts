import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  ListSchedulesFilter,
  ScheduleRepository,
  ScheduleRow,
} from '~/server/repositories/schedule.repository'
import type { ListPage } from '~/server/repositories/tenant.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListSchedulesForWorkspaceInput {
  workspaceId: string
  filter?: ListSchedulesFilter
  cursor?: string | null
  limit?: number
}

export type ListSchedulesForWorkspaceResult =
  | { success: true; data: ListPage<ScheduleRow> }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function listSchedulesForWorkspace(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  principal: Principal | null,
  input: ListSchedulesForWorkspaceInput,
): Promise<ListSchedulesForWorkspaceResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const data = await scheduleRepo.listForWorkspace(
    input.workspaceId,
    input.filter ?? {},
    input.cursor ?? null,
    input.limit ?? 20,
  )
  return { success: true, data }
}
