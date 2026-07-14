/**
 * Plan tier as a string-literal union — client-safe (does not pull
 * the Prisma runtime into client bundles). Prisma's generated `PlanTier`
 * has the same shape; types are interoperable at the boundary.
 */
export type PlanTier = 'FREE' | 'SMALL_TEAM' | 'BUSINESS' | 'CORPORATE'

/**
 * Numeric resource keys (counted via `prisma.count` / `prisma.aggregate`).
 * Storage is bytes-aggregated and converted to MB at the boundary.
 */
export type NumericResourceKey =
  | 'workspacesPerTenant'
  | 'membersPerWorkspace'
  | 'categoriesPerWorkspace'
  | 'specialtiesPerWorkspace'
  | 'activeSchedulesPerWorkspace'
  | 'shiftsPerMonthPerWorkspace'
  | 'requestsPerMonthPerWorkspace'
  | 'storageMBPerWorkspace'
  | 'attachmentSizeMB'
  | 'timeEntryHistoryDays'

/** Boolean / capability resource keys (presence-only, no count). */
export type BooleanResourceKey = 'tenantScopedCatalogs'

export type ResourceKey = NumericResourceKey | BooleanResourceKey

export type NumericLimit = number | null
export type BooleanLimit = boolean

interface PlanLimitRow {
  workspacesPerTenant: NumericLimit
  membersPerWorkspace: NumericLimit
  categoriesPerWorkspace: NumericLimit
  specialtiesPerWorkspace: NumericLimit
  activeSchedulesPerWorkspace: NumericLimit
  shiftsPerMonthPerWorkspace: NumericLimit
  requestsPerMonthPerWorkspace: NumericLimit
  storageMBPerWorkspace: NumericLimit
  attachmentSizeMB: NumericLimit
  timeEntryHistoryDays: NumericLimit
  tenantScopedCatalogs: BooleanLimit
}

/**
 * Canonical v2 limits table — single source of truth.
 *
 * Mirrors `docs/tasks/15-plan-limits/brief.md §FR2` and
 * `docs/BUSINESS-FOUNDATION.md §8` (rewritten to match this table).
 *
 * `null` means unlimited (Corporate ∞ on numeric resources).
 */
export const PLAN_LIMITS: Record<PlanTier, PlanLimitRow> = {
  FREE: {
    workspacesPerTenant: 1,
    membersPerWorkspace: 20,
    categoriesPerWorkspace: 5,
    specialtiesPerWorkspace: 5,
    activeSchedulesPerWorkspace: 2,
    shiftsPerMonthPerWorkspace: 200,
    requestsPerMonthPerWorkspace: 40,
    storageMBPerWorkspace: 100,
    attachmentSizeMB: 2,
    timeEntryHistoryDays: 90,
    tenantScopedCatalogs: false,
  },
  SMALL_TEAM: {
    workspacesPerTenant: 3,
    membersPerWorkspace: 60,
    categoriesPerWorkspace: 15,
    specialtiesPerWorkspace: 15,
    activeSchedulesPerWorkspace: 5,
    shiftsPerMonthPerWorkspace: 1000,
    requestsPerMonthPerWorkspace: 200,
    storageMBPerWorkspace: 500,
    attachmentSizeMB: 5,
    timeEntryHistoryDays: 365,
    tenantScopedCatalogs: false,
  },
  BUSINESS: {
    workspacesPerTenant: 10,
    membersPerWorkspace: 200,
    categoriesPerWorkspace: 50,
    specialtiesPerWorkspace: 50,
    activeSchedulesPerWorkspace: 20,
    shiftsPerMonthPerWorkspace: 4000,
    requestsPerMonthPerWorkspace: 1000,
    storageMBPerWorkspace: 4096,
    attachmentSizeMB: 25,
    timeEntryHistoryDays: 1095,
    tenantScopedCatalogs: false,
  },
  CORPORATE: {
    workspacesPerTenant: null,
    membersPerWorkspace: null,
    categoriesPerWorkspace: null,
    specialtiesPerWorkspace: null,
    activeSchedulesPerWorkspace: null,
    shiftsPerMonthPerWorkspace: null,
    requestsPerMonthPerWorkspace: null,
    storageMBPerWorkspace: 40960,
    attachmentSizeMB: 100,
    timeEntryHistoryDays: null,
    tenantScopedCatalogs: true,
  },
}

const NUMERIC_RESOURCES: NumericResourceKey[] = [
  'workspacesPerTenant',
  'membersPerWorkspace',
  'categoriesPerWorkspace',
  'specialtiesPerWorkspace',
  'activeSchedulesPerWorkspace',
  'shiftsPerMonthPerWorkspace',
  'requestsPerMonthPerWorkspace',
  'storageMBPerWorkspace',
  'attachmentSizeMB',
  'timeEntryHistoryDays',
]

export function isNumericResource(
  resource: ResourceKey,
): resource is NumericResourceKey {
  return (NUMERIC_RESOURCES as readonly string[]).includes(resource)
}

const PLAN_RANK: Record<PlanTier, number> = {
  FREE: 0,
  SMALL_TEAM: 1,
  BUSINESS: 2,
  CORPORATE: 3,
}

export function isDowngrade(from: PlanTier, to: PlanTier): boolean {
  return PLAN_RANK[to] < PLAN_RANK[from]
}

export function isUpgrade(from: PlanTier, to: PlanTier): boolean {
  return PLAN_RANK[to] > PLAN_RANK[from]
}
