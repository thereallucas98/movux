import { PLAN_LIMITS, type PlanTier } from './plan-limits.config'
import {
  countActiveMembers,
  countActiveSchedules,
  countRequestsThisMonth,
  countShiftsInMonth,
  countWorkspaceCategories,
  countWorkspaceSpecialties,
  countWorkspaceStorageMB,
  countWorkspaces,
  type CountersDeps,
} from './usage-counters'

export interface QuotaViolation {
  resource:
    | 'workspacesPerTenant'
    | 'membersPerWorkspace'
    | 'categoriesPerWorkspace'
    | 'specialtiesPerWorkspace'
    | 'activeSchedulesPerWorkspace'
    | 'shiftsPerMonthPerWorkspace'
    | 'requestsPerMonthPerWorkspace'
    | 'storageMBPerWorkspace'
    | 'tenantScopedCatalogs'
  workspaceId?: string
  current: number
  newLimit: number | null
}

export interface DetectViolationsArgs {
  tenantId: string
  targetPlan: PlanTier
  timezone: string
  now?: Date
}

/**
 * Runs every workspace-scoped counter against `targetPlan`'s limits and
 * collects every resource currently over budget.
 *
 * Used by `changeTenantPlan` to decide whether a downgrade should set a grace
 * period (research §7).
 */
export async function detectViolations(
  deps: CountersDeps,
  args: DetectViolationsArgs,
): Promise<QuotaViolation[]> {
  const { tenantId, targetPlan, timezone } = args
  const now = args.now ?? new Date()
  const limits = PLAN_LIMITS[targetPlan]
  const violations: QuotaViolation[] = []

  // Tenant-scope: workspaces
  if (limits.workspacesPerTenant !== null) {
    const current = await countWorkspaces(deps, { tenantId })
    if (current > limits.workspacesPerTenant) {
      violations.push({
        resource: 'workspacesPerTenant',
        current,
        newLimit: limits.workspacesPerTenant,
      })
    }
  }

  // Tenant-scope: tenantScopedCatalogs (Corporate-only capability)
  // If the tenant has tenant-level Category/Specialty rows AND the new plan
  // forbids them, emit a violation. (For v1 these rows are created via the
  // tenant-scope endpoints in Step 25/26.)
  if (!limits.tenantScopedCatalogs) {
    const tenantCategoryCount = await deps.db.category.count({
      where: { tenantId, scope: 'TENANT', isActive: true },
    })
    const tenantSpecialtyCount = await deps.db.specialty.count({
      where: { tenantId, scope: 'TENANT', isActive: true },
    })
    if (tenantCategoryCount + tenantSpecialtyCount > 0) {
      violations.push({
        resource: 'tenantScopedCatalogs',
        current: tenantCategoryCount + tenantSpecialtyCount,
        newLimit: null,
      })
    }
  }

  // Workspace-scope: iterate every active workspace
  const workspaces = await deps.db.workspace.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, timezone: true },
  })

  for (const ws of workspaces) {
    const tz = ws.timezone ?? timezone

    if (limits.membersPerWorkspace !== null) {
      const current = await countActiveMembers(deps, { workspaceId: ws.id })
      if (current > limits.membersPerWorkspace) {
        violations.push({
          resource: 'membersPerWorkspace',
          workspaceId: ws.id,
          current,
          newLimit: limits.membersPerWorkspace,
        })
      }
    }

    if (limits.categoriesPerWorkspace !== null) {
      const current = await countWorkspaceCategories(deps, {
        workspaceId: ws.id,
      })
      if (current > limits.categoriesPerWorkspace) {
        violations.push({
          resource: 'categoriesPerWorkspace',
          workspaceId: ws.id,
          current,
          newLimit: limits.categoriesPerWorkspace,
        })
      }
    }

    if (limits.specialtiesPerWorkspace !== null) {
      const current = await countWorkspaceSpecialties(deps, {
        workspaceId: ws.id,
      })
      if (current > limits.specialtiesPerWorkspace) {
        violations.push({
          resource: 'specialtiesPerWorkspace',
          workspaceId: ws.id,
          current,
          newLimit: limits.specialtiesPerWorkspace,
        })
      }
    }

    if (limits.activeSchedulesPerWorkspace !== null) {
      const current = await countActiveSchedules(deps, { workspaceId: ws.id })
      if (current > limits.activeSchedulesPerWorkspace) {
        violations.push({
          resource: 'activeSchedulesPerWorkspace',
          workspaceId: ws.id,
          current,
          newLimit: limits.activeSchedulesPerWorkspace,
        })
      }
    }

    if (limits.shiftsPerMonthPerWorkspace !== null) {
      const current = await countShiftsInMonth(deps, {
        workspaceId: ws.id,
        monthDate: now,
        timeZone: tz,
      })
      if (current > limits.shiftsPerMonthPerWorkspace) {
        violations.push({
          resource: 'shiftsPerMonthPerWorkspace',
          workspaceId: ws.id,
          current,
          newLimit: limits.shiftsPerMonthPerWorkspace,
        })
      }
    }

    if (limits.requestsPerMonthPerWorkspace !== null) {
      const current = await countRequestsThisMonth(deps, {
        workspaceId: ws.id,
        now,
        timeZone: tz,
      })
      if (current > limits.requestsPerMonthPerWorkspace) {
        violations.push({
          resource: 'requestsPerMonthPerWorkspace',
          workspaceId: ws.id,
          current,
          newLimit: limits.requestsPerMonthPerWorkspace,
        })
      }
    }

    if (limits.storageMBPerWorkspace !== null) {
      const current = await countWorkspaceStorageMB(deps, {
        workspaceId: ws.id,
      })
      if (current > limits.storageMBPerWorkspace) {
        violations.push({
          resource: 'storageMBPerWorkspace',
          workspaceId: ws.id,
          current,
          newLimit: limits.storageMBPerWorkspace,
        })
      }
    }
  }

  return violations
}
