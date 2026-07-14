import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  RequestRepository,
  RequestWithRelationsRow,
} from '~/server/repositories/request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

const COORD_ROLES = new Set(['ADMIN', 'COORDENADOR'])

export interface GetRequestInput {
  requestId: string
}

export type GetRequestResult =
  | { success: true; data: RequestWithRelationsRow }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function getRequest(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  requestRepo: RequestRepository,
  principal: Principal | null,
  input: GetRequestInput,
): Promise<GetRequestResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const row = await requestRepo.findByIdWithRelations(input.requestId)
  if (!row) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    row.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  const isCoord = COORD_ROLES.has(auth.membership.role)
  const isParticipant =
    row.requestedById === principal.userId ||
    row.swapTargetUserId === principal.userId
  if (!isCoord && !isParticipant) {
    return { success: false, code: 'FORBIDDEN' }
  }

  return { success: true, data: row }
}
