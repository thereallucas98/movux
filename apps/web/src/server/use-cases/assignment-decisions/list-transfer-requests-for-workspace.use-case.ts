import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { ListPage } from '~/server/repositories/tenant.repository'
import type {
  ListTransferRequestsFilter,
  TransferRequestRepository,
  TransferRequestRow,
} from '~/server/repositories/transfer-request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListTransferRequestsForWorkspaceInput {
  workspaceId: string
  filter: ListTransferRequestsFilter
  cursor?: string
  limit: number
}

export type ListTransferRequestsForWorkspaceResult =
  | { success: true; data: ListPage<TransferRequestRow> }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function listTransferRequestsForWorkspace(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  transferRequestRepo: TransferRequestRepository,
  principal: Principal | null,
  input: ListTransferRequestsForWorkspaceInput,
): Promise<ListTransferRequestsForWorkspaceResult> {
  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const page = await transferRequestRepo.listForWorkspace(
    input.workspaceId,
    input.filter,
    input.cursor,
    input.limit,
  )
  return { success: true, data: page }
}
