import type {
  BooleanResourceKey,
  NumericResourceKey,
  PlanTier,
  ResourceKey,
} from './plan-limits.config'

/**
 * Per-resource state captured at quota-check time.
 *
 * Discriminated by `shape`:
 *  - 'simple'  : numeric resource hit its limit at create time
 *  - 'boolean' : boolean capability missing for the current plan
 *  - 'pattern' : multi-month pre-flight overflow on shift pattern generation
 *
 * `gracePeriodExpired` is set when the rejection happened *because* the
 * tenant had a grace window that has now closed (research §7).
 */
export interface SimpleResourceMeta {
  shape: 'simple'
  resource: NumericResourceKey
  plan: PlanTier
  limit: number
  current: number
  gracePeriodExpired?: boolean
}

export interface BooleanResourceMeta {
  shape: 'boolean'
  resource: BooleanResourceKey
  plan: PlanTier
  allowed: false
  gracePeriodExpired?: boolean
}

export interface BucketState {
  existing: number
  requested: number
  projected: number
  limit: number
}

export interface PatternBucketMeta {
  shape: 'pattern'
  resource: 'shiftsPerMonthPerWorkspace'
  plan: PlanTier
  perMonth: Record<string, BucketState>
  suggestion: { adjustedEndDate: Date; wouldGenerate: number }
  gracePeriodExpired?: boolean
}

export type PlanLimitMeta =
  | SimpleResourceMeta
  | BooleanResourceMeta
  | PatternBucketMeta

export function isSimpleMeta(m: PlanLimitMeta): m is SimpleResourceMeta {
  return m.shape === 'simple'
}

export function isBooleanMeta(m: PlanLimitMeta): m is BooleanResourceMeta {
  return m.shape === 'boolean'
}

export function isPatternMeta(m: PlanLimitMeta): m is PatternBucketMeta {
  return m.shape === 'pattern'
}

/** Resources that the simple-meta shape can refer to. */
export type SimpleMetaResource = SimpleResourceMeta['resource']

/** Convenience: the `resource` field, regardless of variant. */
export function metaResource(m: PlanLimitMeta): ResourceKey {
  return m.resource
}
