import type { PlanLimitMeta } from './plan-limit-meta'

/**
 * Thrown by `enforceQuota` when a create-path is rejected by the policy layer.
 *
 * Maps 1:1 to the REST `409 PLAN_LIMIT_REACHED` response and to the GraphQL
 * `PLAN_LIMIT_REACHED` extension code. The `meta` payload is what F13 reads
 * to render banners with concrete numbers.
 */
export class PlanLimitError extends Error {
  readonly code = 'PLAN_LIMIT_REACHED' as const
  readonly meta: PlanLimitMeta

  constructor(meta: PlanLimitMeta) {
    super('Plan limit reached')
    this.name = 'PlanLimitError'
    this.meta = meta
  }
}

export function isPlanLimitError(e: unknown): e is PlanLimitError {
  return e instanceof PlanLimitError
}
