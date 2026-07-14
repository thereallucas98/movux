import { prisma } from '~/lib/db'
import { assertAdminOfWorkspace } from '~/server/authorization/assert-admin-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftExpectedCompositionRepository } from '~/server/repositories/shift-expected-composition.repository'
import type { SpecialtyRepository } from '~/server/repositories/specialty.repository'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SoftDeleteWorkspaceSpecialtyInput {
  workspaceId: string
  specialtyId: string
}

export type SoftDeleteWorkspaceSpecialtyResult =
  | { success: true }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'CANNOT_DELETE_IN_USE'
    }

export async function softDeleteWorkspaceSpecialty(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  specialtyRepo: SpecialtyRepository,
  userSpecialtyRepo: UserSpecialtyRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SoftDeleteWorkspaceSpecialtyInput,
): Promise<SoftDeleteWorkspaceSpecialtyResult> {
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

    const userInUse = await userSpecialtyRepo.countActiveBySpecialty(
      input.specialtyId,
      tx,
    )
    if (userInUse > 0) {
      return { success: false, code: 'CANNOT_DELETE_IN_USE' as const }
    }
    const compositionInUse = await compositionRepo.countActiveBySpecialty(
      input.specialtyId,
      tx,
    )
    if (compositionInUse > 0) {
      return { success: false, code: 'CANNOT_DELETE_IN_USE' as const }
    }

    await specialtyRepo.softDelete(input.specialtyId, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_SPECIALTY_DELETED',
        entityType: 'WORKSPACE_SPECIALTY',
        entityId: input.specialtyId,
        metadata: {
          workspaceId: input.workspaceId,
          slug: existing.slug,
        },
      },
      tx,
    )
    return { success: true as const }
  })
}
