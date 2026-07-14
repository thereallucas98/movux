import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type {
  TimeEntryRepository,
  TimeEntryWithJoinsRow,
} from '~/server/repositories/time-entry.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListTimeEntriesInput {
  workspaceId: string
  from?: Date
  to?: Date
  userId?: string
  cursor?: string | null
  limit?: number
}

export type ListTimeEntriesResult =
  | {
      success: true
      data: TimeEntryWithJoinsRow[]
      nextCursor: string | null
    }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

function defaultRange(): { from: Date; to: Date } {
  const now = new Date()
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  )
  return { from, to: now }
}

export async function listTimeEntries(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  timeEntryRepo: TimeEntryRepository,
  principal: Principal | null,
  input: ListTimeEntriesInput,
): Promise<ListTimeEntriesResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  const range = defaultRange()
  const filter = {
    workspaceId: input.workspaceId,
    from: input.from ?? range.from,
    to: input.to ?? range.to,
    ...(input.userId && { userId: input.userId }),
  }
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
  const page = await timeEntryRepo.listForWorkspace(filter, input.cursor, limit)
  return { success: true, data: page.data, nextCursor: page.nextCursor }
}
