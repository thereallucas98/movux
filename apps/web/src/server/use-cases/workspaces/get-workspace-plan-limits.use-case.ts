import { prisma } from '~/lib/db'
import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import {
  PLAN_LIMITS,
  type PlanTier,
} from '~/server/plan-limits/plan-limits.config'
import {
  countActiveMembers,
  countActiveSchedules,
  countRequestsThisMonth,
  countShiftsInMonth,
  countWorkspaceCategories,
  countWorkspaceSpecialties,
  countWorkspaceStorageMB,
  type CountersDeps,
} from '~/server/plan-limits/usage-counters'
import type { TenantRepository } from '~/server/repositories/tenant.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'
import type { PlanLimitResource } from '../tenants/get-tenant-plan-limits.use-case'

export interface WorkspacePlanLimitsData {
  workspaceId: string
  tenantId: string
  plan: PlanTier
  gracePeriodUntil: Date | null
  resources: {
    members: PlanLimitResource
    categories: PlanLimitResource
    specialties: PlanLimitResource
    activeSchedules: PlanLimitResource
    shiftsThisMonth: PlanLimitResource
    requestsThisMonth: PlanLimitResource
    storageMB: PlanLimitResource
  }
}

export type GetWorkspacePlanLimitsResult =
  | { success: true; data: WorkspacePlanLimitsData }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function getWorkspacePlanLimits(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  tenantRepo: TenantRepository,
  principal: Principal | null,
  input: { workspaceId: string },
  options?: { deps?: CountersDeps; now?: Date },
): Promise<GetWorkspacePlanLimitsResult> {
  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const workspace = await workspaceRepo.findById(input.workspaceId)
  if (!workspace) return { success: false, code: 'NOT_FOUND' }

  const tenant = await tenantRepo.findById(workspace.tenantId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }

  const counterDeps = options?.deps ?? { db: prisma }
  const now = options?.now ?? new Date()
  const limits = PLAN_LIMITS[tenant.plan]

  const [
    members,
    categories,
    specialties,
    schedules,
    shifts,
    requests,
    storage,
  ] = await Promise.all([
    countActiveMembers(counterDeps, { workspaceId: workspace.id }),
    countWorkspaceCategories(counterDeps, { workspaceId: workspace.id }),
    countWorkspaceSpecialties(counterDeps, { workspaceId: workspace.id }),
    countActiveSchedules(counterDeps, { workspaceId: workspace.id }),
    countShiftsInMonth(counterDeps, {
      workspaceId: workspace.id,
      monthDate: now,
      timeZone: workspace.timezone,
    }),
    countRequestsThisMonth(counterDeps, {
      workspaceId: workspace.id,
      now,
      timeZone: workspace.timezone,
    }),
    countWorkspaceStorageMB(counterDeps, { workspaceId: workspace.id }),
  ])

  return {
    success: true,
    data: {
      workspaceId: workspace.id,
      tenantId: workspace.tenantId,
      plan: tenant.plan,
      gracePeriodUntil: tenant.gracePeriodUntil,
      resources: {
        members: makeResource(limits.membersPerWorkspace, members),
        categories: makeResource(limits.categoriesPerWorkspace, categories),
        specialties: makeResource(limits.specialtiesPerWorkspace, specialties),
        activeSchedules: makeResource(
          limits.activeSchedulesPerWorkspace,
          schedules,
        ),
        shiftsThisMonth: makeResource(
          limits.shiftsPerMonthPerWorkspace,
          shifts,
        ),
        requestsThisMonth: makeResource(
          limits.requestsPerMonthPerWorkspace,
          requests,
        ),
        storageMB: makeResource(limits.storageMBPerWorkspace, storage),
      },
    },
  }
}

function makeResource(
  limit: number | null,
  current: number,
): PlanLimitResource {
  if (limit === null) {
    return { limit: null, current, percent: null, exhausted: false }
  }
  const percent = Math.floor((current / limit) * 100)
  return { limit, current, percent, exhausted: current >= limit }
}
