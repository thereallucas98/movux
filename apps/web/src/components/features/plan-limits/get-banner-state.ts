/**
 * Banner state for a single resource, decided by per-category thresholds:
 *
 * - `limit ≤ 5`  → warning when `remaining ≤ 1` (penultimate slot)
 * - `limit ≤ 50` → warning when `current/limit ≥ 0.8` (80%)
 * - `limit > 50` → warning when `current/limit ≥ 0.9` (90%)
 *
 * `null` limit (Corporate / unbounded resources) returns `'hidden'`.
 * `current >= limit` always returns `'destructive'` regardless of category.
 *
 * See `docs/tasks/f13-plan-limits-banners/research.md §1` for rationale.
 */

export type BannerState = 'hidden' | 'warning' | 'destructive'

export function getBannerState(
  current: number,
  limit: number | null,
): BannerState {
  if (limit === null) return 'hidden'
  if (current >= limit) return 'destructive'
  const remaining = limit - current
  if (limit <= 5) {
    return remaining <= 1 ? 'warning' : 'hidden'
  }
  if (limit <= 50) {
    return current / limit >= 0.8 ? 'warning' : 'hidden'
  }
  return current / limit >= 0.9 ? 'warning' : 'hidden'
}
