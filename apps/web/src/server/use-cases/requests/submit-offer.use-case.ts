import { prisma } from '~/lib/db'
import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import { notifyRequestSubmitted } from '~/server/notifications/request-events'
import {
  loadTenantContextByWorkspaceId,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SubmitOfferInput {
  workspaceId: string
  offerSourceAssignmentId: string
  reason: string
}

export type SubmitOfferResult =
  | { success: true; data: RequestRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }
  | PlanLimitFailure

export async function submitOfferRequest(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  requestRepo: RequestRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SubmitOfferInput,
): Promise<SubmitOfferResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  const tenant = await loadTenantContextByWorkspaceId(input.workspaceId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }
  const planLimit = await tryEnforce({
    tenant,
    resource: 'requestsPerMonthPerWorkspace',
    workspaceId: input.workspaceId,
    timeZone: tenant.workspaceTimezone,
  })
  if (planLimit) return planLimit

  const source = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.offerSourceAssignmentId,
  )
  if (!source) return { success: false, code: 'NOT_FOUND' }
  if (source.shift.schedule.workspaceId !== input.workspaceId) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (source.userId !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }
  if (source.status !== 'ACCEPTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (source.shift.startAt.getTime() <= Date.now()) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (source.shift.assignmentMode !== 'DIRECT_ASSIGN') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await requestRepo.createOffer(
      {
        workspaceId: input.workspaceId,
        requestedById: principal.userId,
        reason: input.reason,
        offerSourceAssignmentId: input.offerSourceAssignmentId,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'REQUEST_OFFER_SUBMITTED',
        entityType: 'REQUEST',
        entityId: c.id,
        metadata: {
          workspaceId: input.workspaceId,
          type: 'OFFER',
          shiftId: source.shift.id,
          offerSourceAssignmentId: input.offerSourceAssignmentId,
        },
      },
      tx,
    )
    return c
  })

  const coords = await workspaceMembershipRepo.listActiveByRole(
    input.workspaceId,
    ['ADMIN', 'COORDENADOR'],
  )
  await notifyRequestSubmitted({
    requestId: created.id,
    workspaceId: input.workspaceId,
    requestType: 'OFFER',
    requestedByUserId: principal.userId,
    recipientUserIds: coords.map((c) => c.userId),
  })

  return { success: true, data: created }
}
