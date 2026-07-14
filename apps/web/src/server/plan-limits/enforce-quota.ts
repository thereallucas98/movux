import {
  checkAttachmentSize,
  checkBooleanQuota,
  checkQuota,
} from './check-quota'
import { PlanLimitError } from './plan-limit-error'
import type {
  BooleanResourceMeta,
  PatternBucketMeta,
  PlanLimitMeta,
  SimpleResourceMeta,
} from './plan-limit-meta'
import {
  type BooleanResourceKey,
  type NumericResourceKey,
  type PlanTier,
  type ResourceKey,
  isNumericResource,
} from './plan-limits.config'
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

/**
 * Resolved tenant context — usually fetched once by the caller and reused
 * across multiple `enforceQuota` calls in the same use case (e.g. when
 * creating shifts in a transaction).
 */
export interface TenantContext {
  id: string
  plan: PlanTier
  gracePeriodUntil: Date | null
  timezone: string
}

export interface EnforceQuotaArgs {
  tenant: TenantContext
  resource: ResourceKey
  workspaceId?: string
  /** For monthly counters, the date that anchors the bucket. Defaults to `now`. */
  monthDate?: Date
  /** Workspace timezone override; falls back to tenant.timezone. */
  timeZone?: string
  /** Injected for tests. Defaults to `() => new Date()`. */
  now?: () => Date
}

/**
 * Combines counter + check for a single resource. Reads the tenant's plan and
 * grace period from `tenant`. Throws `PlanLimitError` on rejection — unless a
 * grace window is currently active, in which case the create is allowed
 * through and a structured log line is emitted.
 */
export async function enforceQuota(
  deps: CountersDeps,
  args: EnforceQuotaArgs,
): Promise<void> {
  const { tenant, resource } = args
  const now = (args.now ?? (() => new Date()))()

  if (isNumericResource(resource)) {
    const current = await readNumericCount(deps, resource, args, now)
    const result = checkQuota(tenant.plan, resource, current)
    if (result.allowed) return
    return rejectOrGrace(tenant, now, () => ({
      shape: 'simple',
      resource,
      plan: tenant.plan,
      limit: result.limit ?? Number.MAX_SAFE_INTEGER,
      current,
    }))
  }

  // Boolean resource path
  const booleanResource = resource as BooleanResourceKey
  const result = checkBooleanQuota(tenant.plan, booleanResource)
  if (result.allowed) return
  return rejectOrGrace(tenant, now, () => ({
    shape: 'boolean',
    resource: booleanResource,
    plan: tenant.plan,
    allowed: false,
  }))
}

/**
 * Per-upload size cap. Pure function wrapper that throws the same error type
 * so route handlers don't need a second catch path.
 */
export function enforcePerUploadAttachmentSize(
  plan: PlanTier,
  sizeBytes: number,
): void {
  const result = checkAttachmentSize(plan, sizeBytes)
  if (result.allowed) return
  throw new PlanLimitError({
    shape: 'simple',
    resource: 'attachmentSizeMB',
    plan,
    limit: result.limitMB,
    current: result.sizeMB,
  })
}

/**
 * Reject by throwing `PlanLimitError`, OR allow-with-log if a grace window is
 * currently active. Used by `enforceQuota` and `throwPatternPlanLimit`.
 */
export function rejectOrGrace<
  M extends SimpleResourceMeta | BooleanResourceMeta | PatternBucketMeta,
>(tenant: TenantContext, now: Date, buildMeta: () => M): void {
  const inGrace =
    tenant.gracePeriodUntil !== null && tenant.gracePeriodUntil > now
  if (inGrace) {
    const meta = buildMeta()
    console.info(
      JSON.stringify({
        event: 'plan_limit_grace',
        tenantId: tenant.id,
        plan: tenant.plan,
        resource: meta.resource,
        gracePeriodUntil: tenant.gracePeriodUntil!.toISOString(),
      }),
    )
    return
  }
  const meta = buildMeta()
  const enriched = {
    ...meta,
    gracePeriodExpired: tenant.gracePeriodUntil !== null,
  } as PlanLimitMeta
  console.warn(
    JSON.stringify({
      event: 'plan_limit_reached',
      tenantId: tenant.id,
      plan: tenant.plan,
      resource: meta.resource,
      gracePeriodExpired: enriched.gracePeriodExpired ?? false,
    }),
  )
  throw new PlanLimitError(enriched)
}

async function readNumericCount(
  deps: CountersDeps,
  resource: NumericResourceKey,
  args: EnforceQuotaArgs,
  now: Date,
): Promise<number> {
  const { tenant, workspaceId } = args
  const tz = args.timeZone ?? tenant.timezone
  switch (resource) {
    case 'workspacesPerTenant':
      return countWorkspaces(deps, { tenantId: tenant.id })
    case 'membersPerWorkspace':
      assertWorkspaceId(workspaceId, resource)
      return countActiveMembers(deps, { workspaceId })
    case 'categoriesPerWorkspace':
      assertWorkspaceId(workspaceId, resource)
      return countWorkspaceCategories(deps, { workspaceId })
    case 'specialtiesPerWorkspace':
      assertWorkspaceId(workspaceId, resource)
      return countWorkspaceSpecialties(deps, { workspaceId })
    case 'activeSchedulesPerWorkspace':
      assertWorkspaceId(workspaceId, resource)
      return countActiveSchedules(deps, { workspaceId })
    case 'shiftsPerMonthPerWorkspace':
      assertWorkspaceId(workspaceId, resource)
      return countShiftsInMonth(deps, {
        workspaceId,
        monthDate: args.monthDate ?? now,
        timeZone: tz,
      })
    case 'requestsPerMonthPerWorkspace':
      assertWorkspaceId(workspaceId, resource)
      return countRequestsThisMonth(deps, {
        workspaceId,
        now,
        timeZone: tz,
      })
    case 'storageMBPerWorkspace':
      assertWorkspaceId(workspaceId, resource)
      return countWorkspaceStorageMB(deps, { workspaceId })
    case 'attachmentSizeMB':
    case 'timeEntryHistoryDays':
      // Not enforced via counters — `attachmentSizeMB` uses
      // `enforcePerUploadAttachmentSize`; `timeEntryHistoryDays` is a
      // read-side filter, not a create-side gate.
      throw new Error(
        `enforceQuota: resource '${resource}' is not counter-enforced; use a dedicated check instead.`,
      )
  }
}

function assertWorkspaceId(
  workspaceId: string | undefined,
  resource: NumericResourceKey,
): asserts workspaceId is string {
  if (!workspaceId) {
    throw new Error(
      `enforceQuota: resource '${resource}' requires args.workspaceId`,
    )
  }
}
