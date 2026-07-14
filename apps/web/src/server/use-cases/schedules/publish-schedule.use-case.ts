import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { notifySchedulePublished } from '~/server/notifications/schedule-events'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  ScheduleRepository,
  ScheduleRow,
} from '~/server/repositories/schedule.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface PublishScheduleInput {
  scheduleId: string
}

export type PublishScheduleResult =
  | { success: true; data: ScheduleRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function publishSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: PublishScheduleInput,
): Promise<PublishScheduleResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }
  const current = await scheduleRepo.findById(input.scheduleId)
  if (!current) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    current.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (current.status !== 'DRAFT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await scheduleRepo.update(
      current.id,
      { status: 'PUBLISHED', publishedAt: new Date() },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'SCHEDULE_PUBLISHED',
        entityType: 'SCHEDULE',
        entityId: updated.id,
        metadata: {
          workspaceId: updated.workspaceId,
          categoryId: updated.categoryId,
          publishedAt: updated.publishedAt,
        },
      },
      tx,
    )
    return updated
  })

  // Fire-and-forget notification, after tx commit.
  const recipients = await workspaceMembershipRepo.listActiveByRole(
    result.workspaceId,
    ['ADMIN', 'COORDENADOR', 'COLABORADOR'],
  )
  await notifySchedulePublished({
    schedule: {
      id: result.id,
      workspaceId: result.workspaceId,
      categoryId: result.categoryId,
      name: result.name,
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
    },
    actorUserId: principal.userId,
    recipientUserIds: recipients.map((r) => r.userId),
  })

  return { success: true, data: result }
}
