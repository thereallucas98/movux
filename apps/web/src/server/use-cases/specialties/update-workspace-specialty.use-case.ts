import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  SpecialtyRepository,
  SpecialtyRow,
} from '~/server/repositories/specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface UpdateWorkspaceSpecialtyInput {
  workspaceId: string
  specialtyId: string
  data: {
    name?: string
    description?: string | null
  }
}

export type UpdateWorkspaceSpecialtyResult =
  | { success: true; data: SpecialtyRow }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function updateWorkspaceSpecialty(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  specialtyRepo: SpecialtyRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UpdateWorkspaceSpecialtyInput,
): Promise<UpdateWorkspaceSpecialtyResult> {
  const auth = await assertAdminOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  return prisma.$transaction(async (tx) => {
    const existing = await specialtyRepo.findById(input.specialtyId, tx)
    if (
      !existing ||
      existing.scope !== 'WORKSPACE' ||
      existing.workspaceId !== input.workspaceId
    ) {
      return { success: false, code: 'NOT_FOUND' as const }
    }

    const updated = await specialtyRepo.update(
      input.specialtyId,
      input.data,
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_SPECIALTY_UPDATED',
        entityType: 'WORKSPACE_SPECIALTY',
        entityId: input.specialtyId,
        metadata: {
          workspaceId: input.workspaceId,
          changes: input.data,
        },
      },
      tx,
    )
    return { success: true as const, data: updated }
  })
}
