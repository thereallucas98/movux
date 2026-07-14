import { prisma } from '~/lib/db'
import { deleteFile, uploadFile } from '~/lib/storage/supabase'
import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import { notifyRequestSubmitted } from '~/server/notifications/request-events'
import {
  loadTenantContextByWorkspaceId,
  tryEnforce,
  tryEnforceAttachmentSize,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  RequestRepository,
  RequestRow,
} from '~/server/repositories/request.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SubmitTimeOffInput {
  workspaceId: string
  timeOffStart: Date
  timeOffEnd: Date
  reason: string
  attachment?: {
    file: Buffer | Blob
    contentType: string
    sizeBytes: number
    originalFilename?: string
  } | null
}

export type SubmitTimeOffResult =
  | { success: true; data: RequestRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'VALIDATION_ERROR'
        | 'ATTACHMENT_UPLOAD_FAILED'
    }
  | PlanLimitFailure

const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? 'request-attachments'

export async function submitTimeOffRequest(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  requestRepo: RequestRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SubmitTimeOffInput,
): Promise<SubmitTimeOffResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  if (input.timeOffEnd.getTime() <= input.timeOffStart.getTime()) {
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
  const requestQuota = await tryEnforce({
    tenant,
    resource: 'requestsPerMonthPerWorkspace',
    workspaceId: input.workspaceId,
    timeZone: tenant.workspaceTimezone,
  })
  if (requestQuota) return requestQuota

  if (input.attachment) {
    const sizeFailure = tryEnforceAttachmentSize(
      tenant.plan,
      input.attachment.sizeBytes,
    )
    if (sizeFailure) return sizeFailure
    const storageFailure = await tryEnforce({
      tenant,
      resource: 'storageMBPerWorkspace',
      workspaceId: input.workspaceId,
    })
    if (storageFailure) return storageFailure
  }

  const overlaps = await requestRepo.hasOverlappingApprovedTimeOff({
    userId: principal.userId,
    workspaceId: input.workspaceId,
    timeOffStart: input.timeOffStart,
    timeOffEnd: input.timeOffEnd,
  })
  if (overlaps) return { success: false, code: 'INVALID_STATE_TRANSITION' }

  let attachmentPath: string | null = null
  let attachmentUrl: string | null = null
  if (input.attachment) {
    const safeName = (input.attachment.originalFilename ?? 'attachment')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .slice(0, 80)
    const path = `requests/${input.workspaceId}/${principal.userId}/${Date.now()}-${safeName}`
    try {
      const uploaded = await uploadFile(
        STORAGE_BUCKET,
        path,
        input.attachment.file,
        input.attachment.contentType,
      )
      attachmentPath = uploaded.path
      attachmentUrl = uploaded.url
    } catch {
      return { success: false, code: 'ATTACHMENT_UPLOAD_FAILED' }
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const c = await requestRepo.createTimeOff(
        {
          workspaceId: input.workspaceId,
          requestedById: principal.userId,
          reason: input.reason,
          timeOffStart: input.timeOffStart,
          timeOffEnd: input.timeOffEnd,
          ...(input.attachment && {
            attachmentUrl,
            attachmentMimeType: input.attachment.contentType,
            attachmentSizeBytes: input.attachment.sizeBytes,
          }),
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'REQUEST_TIME_OFF_SUBMITTED',
          entityType: 'REQUEST',
          entityId: c.id,
          metadata: {
            workspaceId: input.workspaceId,
            timeOffStart: input.timeOffStart,
            timeOffEnd: input.timeOffEnd,
            hasAttachment: input.attachment != null,
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
      requestType: 'TIME_OFF',
      requestedByUserId: principal.userId,
      recipientUserIds: coords.map((c) => c.userId),
    })

    return { success: true, data: created }
  } catch (err) {
    if (attachmentPath) {
      await deleteFile(STORAGE_BUCKET, attachmentPath).catch(() => undefined)
    }
    throw err
  }
}
