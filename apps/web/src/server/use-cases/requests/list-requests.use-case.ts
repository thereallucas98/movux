import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  ListRequestsFilter,
  RequestRepository,
  RequestRow,
  RequestStatus,
  RequestType,
} from '~/server/repositories/request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

const COORD_ROLES = new Set(['ADMIN', 'COORDENADOR'])

export interface ListRequestsInput {
  workspaceId: string
  status?: RequestStatus
  type?: RequestType
  scope: 'mine' | 'workspace'
  cursor?: string | null
  limit?: number
}

export type ListRequestsResult =
  | {
      success: true
      data: RequestRow[]
      nextCursor: string | null
    }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN'
    }

export async function listRequests(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  requestRepo: RequestRepository,
  principal: Principal | null,
  input: ListRequestsInput,
): Promise<ListRequestsResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  const isCoord = COORD_ROLES.has(auth.membership.role)
  const filter: ListRequestsFilter = {
    ...(input.status && { status: input.status }),
    ...(input.type && { type: input.type }),
    ...(input.scope === 'mine' || !isCoord
      ? { requestedById: principal.userId }
      : {}),
  }

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
  const page = await requestRepo.listByWorkspace(
    input.workspaceId,
    filter,
    input.cursor,
    limit,
  )
  return { success: true, data: page.data, nextCursor: page.nextCursor }
}
