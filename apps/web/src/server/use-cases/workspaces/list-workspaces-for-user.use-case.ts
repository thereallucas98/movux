import type { ListPage } from '~/server/repositories/tenant.repository'
import type {
  WorkspaceRepository,
  WorkspaceRow,
} from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListWorkspacesForUserInput {
  cursor?: string | null
  limit?: number
}

export type ListWorkspacesForUserResult =
  | { success: true; data: ListPage<WorkspaceRow> }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function listWorkspacesForUser(
  workspaceRepo: WorkspaceRepository,
  principal: Principal | null,
  input: ListWorkspacesForUserInput,
): Promise<ListWorkspacesForUserResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }
  const limit = input.limit ?? 20
  const data = await workspaceRepo.listForUser(
    principal.userId,
    input.cursor ?? null,
    limit,
  )
  return { success: true, data }
}
