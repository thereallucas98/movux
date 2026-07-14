import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { notifyRequestResolved } from '~/server/notifications/request-events'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'
import { canCoordResolve } from './lib/transitions'
import { resolveOffer } from './lib/resolve-offer'
import { resolveSwap } from './lib/resolve-swap'
import { resolveTimeOff } from './lib/resolve-time-off'

export interface ResolveRequestInput {
  requestId: string
  decision: 'APPROVE' | 'REJECT'
  resolutionReason?: string | null
}

export type ResolveRequestResult =
  | { success: true; data: RequestRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'TIME_OFF_TOO_LARGE'
    }

export async function resolveRequest(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  requestRepo: RequestRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ResolveRequestInput,
): Promise<ResolveRequestResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const existing = await requestRepo.findByIdWithRelations(input.requestId)
  if (!existing) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    existing.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  if (!canCoordResolve(existing.status)) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const resolutionReason = input.resolutionReason ?? null

  let result: ResolveRequestResult
  if (input.decision === 'REJECT') {
    result = await prisma.$transaction(async (tx) => {
      const updated = await requestRepo.update(
        input.requestId,
        {
          status: 'REJECTED',
          resolvedAt: new Date(),
          resolvedById: principal.userId,
          resolutionReason,
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'REQUEST_REJECTED',
          entityType: 'REQUEST',
          entityId: updated.id,
          metadata: {
            workspaceId: updated.workspaceId,
            type: updated.type,
            ...(existing.type === 'SWAP' && {
              sourceShiftId: existing.swapSourceAssignment?.shiftId ?? null,
              targetShiftId: existing.swapTargetAssignment?.shiftId ?? null,
            }),
            ...(existing.type === 'OFFER' && {
              shiftId: existing.offerSourceAssignment?.shiftId ?? null,
            }),
          },
        },
        tx,
      )
      return { success: true, data: updated } as ResolveRequestResult
    })
  } else {
    // APPROVE — delegate by type
    result = await prisma.$transaction(async (tx) => {
      if (existing.type === 'SWAP') {
        return resolveSwap(
          { requestRepo, assignmentRepo, auditRepo },
          existing,
          principal.userId,
          resolutionReason,
          tx,
        )
      }
      if (existing.type === 'OFFER') {
        return resolveOffer(
          { requestRepo, shiftRepo, assignmentRepo, auditRepo },
          existing,
          principal.userId,
          resolutionReason,
          tx,
        )
      }
      return resolveTimeOff(
        { requestRepo, shiftRepo, assignmentRepo, auditRepo },
        existing,
        principal.userId,
        resolutionReason,
        tx,
      )
    })
  }

  if (result.success) {
    const recipients = new Set<string>([existing.requestedById])
    if (existing.type === 'SWAP' && existing.swapTargetUserId) {
      recipients.add(existing.swapTargetUserId)
    }
    await notifyRequestResolved({
      requestId: existing.id,
      workspaceId: existing.workspaceId,
      requestType: existing.type,
      resolution: input.decision === 'REJECT' ? 'REJECTED' : 'APPROVED',
      resolvedByUserId: principal.userId,
      resolutionReason,
      recipientUserIds: [...recipients],
    })
  }

  return result
}
