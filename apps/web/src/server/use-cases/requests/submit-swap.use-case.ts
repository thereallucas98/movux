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
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SubmitSwapInput {
  workspaceId: string
  swapSourceAssignmentId: string
  swapTargetUserId: string
  swapTargetAssignmentId: string
  reason: string
}

export type SubmitSwapResult =
  | { success: true; data: RequestRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'VALIDATION_ERROR'
    }
  | PlanLimitFailure

export async function submitSwapRequest(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  requestRepo: RequestRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SubmitSwapInput,
): Promise<SubmitSwapResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  if (input.swapSourceAssignmentId === input.swapTargetAssignmentId) {
    return { success: false, code: 'VALIDATION_ERROR' }
  }
  if (input.swapTargetUserId === principal.userId) {
    return { success: false, code: 'VALIDATION_ERROR' }
  }

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

  const targetMember = await workspaceMembershipRepo.findActive({
    workspaceId: input.workspaceId,
    userId: input.swapTargetUserId,
  })
  if (!targetMember || !targetMember.isActive) {
    return { success: false, code: 'FORBIDDEN' }
  }

  const source = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.swapSourceAssignmentId,
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

  const target = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.swapTargetAssignmentId,
  )
  if (!target) return { success: false, code: 'NOT_FOUND' }
  if (target.shift.schedule.workspaceId !== input.workspaceId) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (target.userId !== input.swapTargetUserId) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (target.status !== 'ACCEPTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (target.shift.startAt.getTime() <= Date.now()) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await requestRepo.createSwap(
      {
        workspaceId: input.workspaceId,
        requestedById: principal.userId,
        reason: input.reason,
        swapSourceAssignmentId: input.swapSourceAssignmentId,
        swapTargetUserId: input.swapTargetUserId,
        swapTargetAssignmentId: input.swapTargetAssignmentId,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'REQUEST_SWAP_SUBMITTED',
        entityType: 'REQUEST',
        entityId: c.id,
        metadata: {
          workspaceId: input.workspaceId,
          type: 'SWAP',
          sourceShiftId: source.shift.id,
          targetShiftId: target.shift.id,
          swapSourceAssignmentId: input.swapSourceAssignmentId,
          swapTargetUserId: input.swapTargetUserId,
          swapTargetAssignmentId: input.swapTargetAssignmentId,
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
  const recipients = Array.from(
    new Set([input.swapTargetUserId, ...coords.map((c) => c.userId)]),
  )
  await notifyRequestSubmitted({
    requestId: created.id,
    workspaceId: input.workspaceId,
    requestType: 'SWAP',
    requestedByUserId: principal.userId,
    recipientUserIds: recipients,
  })

  return { success: true, data: created }
}
