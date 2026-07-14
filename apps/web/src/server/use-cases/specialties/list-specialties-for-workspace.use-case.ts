import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  SpecialtyRepository,
  SpecialtyRow,
  SpecialtyScope,
  SpecialtyVertical,
} from '~/server/repositories/specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListSpecialtiesForWorkspaceInput {
  workspaceId: string
}

export type MergedSpecialty = SpecialtyRow & { source: SpecialtyScope }

export type ListSpecialtiesForWorkspaceResult =
  | { success: true; data: MergedSpecialty[] }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function listSpecialtiesForWorkspace(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  specialtyRepo: SpecialtyRepository,
  principal: Principal | null,
  input: ListSpecialtiesForWorkspaceInput,
): Promise<ListSpecialtiesForWorkspaceResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const workspace = await workspaceRepo.findById(input.workspaceId)
  if (!workspace) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const [globals, tenantSpecs, workspaceSpecs] = await Promise.all([
    specialtyRepo.listGlobal(workspace.vertical as SpecialtyVertical),
    specialtyRepo.listTenant(workspace.tenantId),
    specialtyRepo.listWorkspace(workspace.id),
  ])

  const merged = new Map<string, MergedSpecialty>()
  for (const g of globals) merged.set(g.slug, { ...g, source: 'GLOBAL' })
  for (const t of tenantSpecs) merged.set(t.slug, { ...t, source: 'TENANT' })
  for (const w of workspaceSpecs)
    merged.set(w.slug, { ...w, source: 'WORKSPACE' })

  const sorted = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  )

  return { success: true, data: sorted }
}
