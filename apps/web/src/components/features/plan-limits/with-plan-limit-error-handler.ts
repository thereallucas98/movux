import type { ApiError } from '~/lib/api-error'

import { parsePlanLimitMeta, type PlanLimitMeta } from './parse-plan-limit-meta'

/**
 * Higher-order helper that intercepts `PLAN_LIMIT_REACHED` errors and routes
 * the structured `meta` payload to the right consumer:
 *
 *  - `simple` / `boolean` shapes → `handlers.onSimpleOrBoolean(message)`,
 *    typically called from a form's `onError` to do `setError('root', { message })`.
 *  - `pattern` shape → `handlers.onPattern(meta)`, used by F06b shift-pattern
 *    wizard to render an inline alert with a "Ajustar" button.
 *
 * Non-`PLAN_LIMIT_REACHED` errors fall through to the optional
 * `handlers.onOtherError(error)` callback (or are silently swallowed if absent).
 *
 * See `docs/tasks/f13-plan-limits-banners/research.md §8` for the routing
 * decision and the rationale for *not* using a global toast.
 */
export interface PlanLimitErrorHandlers {
  onSimpleOrBoolean?: (message: string) => void
  onPattern?: (meta: Extract<PlanLimitMeta, { shape: 'pattern' }>) => void
  onOtherError?: (error: ApiError) => void
}

export function handlePlanLimitError(
  error: unknown,
  handlers: PlanLimitErrorHandlers,
): void {
  const apiError = error as ApiError | undefined
  if (
    !apiError ||
    typeof apiError !== 'object' ||
    !('code' in apiError) ||
    apiError.code !== 'PLAN_LIMIT_REACHED'
  ) {
    if (apiError) handlers.onOtherError?.(apiError)
    return
  }

  const meta = apiError.meta as PlanLimitMeta | undefined

  if (meta && meta.shape === 'pattern') {
    handlers.onPattern?.(meta)
    return
  }

  const { description } = parsePlanLimitMeta(meta)
  handlers.onSimpleOrBoolean?.(description)
}
