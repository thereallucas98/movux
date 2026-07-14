import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { ShiftCandidateRepository } from '~/server/repositories/candidate.repository'
import type { RequestRepository } from '~/server/repositories/request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'

import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetDashboardExtrasInput {
  workspaceId: string
  /** Defaults to "now − 14 days" → "now" when omitted. */
  fromAt?: Date
  toAt?: Date
}

export interface DashboardExtras {
  acceptanceRate: {
    accepted: number
    rejected: number
    /** 0–1; null when no decisions in window (avoids fake "100%"). */
    rate: number | null
  }
  candidatesQueued: number
  activeMembers: number
  pendingRequestsByType: { swap: number; offer: number; timeOff: number }
}

export type GetDashboardExtrasResult =
  | { success: true; data: DashboardExtras }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

const DEFAULT_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000

export async function getDashboardExtras(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  candidateRepo: ShiftCandidateRepository,
  requestRepo: RequestRepository,
  principal: Principal | null,
  input: GetDashboardExtrasInput,
): Promise<GetDashboardExtrasResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  const now = new Date()
  const toAt = input.toAt ?? now
  const fromAt = input.fromAt ?? new Date(now.getTime() - DEFAULT_LOOKBACK_MS)

  const [decisions, candidatesQueued, activeMembers, byType] =
    await Promise.all([
      assignmentRepo.countDecidedInRange({
        workspaceId: input.workspaceId,
        fromAt,
        toAt,
      }),
      candidateRepo.countQueuedForWorkspace(input.workspaceId),
      workspaceMembershipRepo.countActive(input.workspaceId),
      requestRepo.countByWorkspaceGroupedByType(input.workspaceId, [
        'PENDING',
        'PENDING_PEER',
      ]),
    ])

  const totalDecisions = decisions.accepted + decisions.rejected
  const rate = totalDecisions > 0 ? decisions.accepted / totalDecisions : null

  return {
    success: true,
    data: {
      acceptanceRate: {
        accepted: decisions.accepted,
        rejected: decisions.rejected,
        rate,
      },
      candidatesQueued,
      activeMembers,
      pendingRequestsByType: byType,
    },
  }
}
