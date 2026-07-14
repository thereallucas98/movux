import {
  PLAN_LIMITS,
  type BooleanResourceKey,
  type NumericResourceKey,
  type PlanTier,
} from './plan-limits.config'

export interface NumericQuotaResult {
  allowed: boolean
  limit: number | null
  current: number
  plan: PlanTier
}

export interface BooleanQuotaResult {
  allowed: boolean
  plan: PlanTier
}

/**
 * Pure check for numeric resources.
 *
 *  - `null` limit → unconditionally allowed (Corporate / unbounded)
 *  - `current + 1 > limit` → rejected
 *  - The "+1" is implicit: this is called *before* the create, so the new row
 *    is the one being budget-checked.
 */
export function checkQuota(
  plan: PlanTier,
  resource: NumericResourceKey,
  current: number,
): NumericQuotaResult {
  const limit = PLAN_LIMITS[plan][resource]
  if (limit === null) {
    return { allowed: true, limit: null, current, plan }
  }
  return { allowed: current + 1 <= limit, limit, current, plan }
}

/**
 * Pure check for boolean capabilities (`tenantScopedCatalogs`).
 */
export function checkBooleanQuota(
  plan: PlanTier,
  resource: BooleanResourceKey,
): BooleanQuotaResult {
  const allowed = PLAN_LIMITS[plan][resource]
  return { allowed, plan }
}

/**
 * Per-upload size cap. `sizeBytes` is whatever the upload pipeline reports
 * before the actual write; checked against `attachmentSizeMB × 1 MiB`.
 */
export function checkAttachmentSize(
  plan: PlanTier,
  sizeBytes: number,
): { allowed: boolean; limitMB: number; sizeMB: number; plan: PlanTier } {
  const limitMB = PLAN_LIMITS[plan].attachmentSizeMB
  const sizeMB = Math.ceil(sizeBytes / (1024 * 1024))
  if (limitMB === null) {
    return { allowed: true, limitMB: Number.POSITIVE_INFINITY, sizeMB, plan }
  }
  return { allowed: sizeMB <= limitMB, limitMB, sizeMB, plan }
}
