/**
 * Decision-window helpers (Task 10).
 *
 * Two pure functions:
 *   - `isWithinDecisionWindow(deadline, now?)` — boolean check used by accept/reject/transfer
 *   - `computeTransferDeadline(opts)` — clamps the new assignment's deadline (research §5)
 *
 * No DB or repos. Tested in isolation.
 */

export const HOUR_MS = 3_600_000
const MIN_WINDOW_MS = 15 * 60_000

export function isWithinDecisionWindow(
  deadline: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() <= deadline.getTime()
}

export interface ComputeTransferDeadlineInput {
  now: Date
  shiftStartAt: Date
  decisionWindowHours: number
}

/**
 * Returns the new deadline for a transfer-target's assignment.
 * Clamping order:
 *   1. Fresh window: now + decisionWindowHours
 *   2. Cap: shiftStartAt - 1h
 *   3. Floor: now + 15min (prevents past or near-zero windows)
 */
export function computeTransferDeadline(
  input: ComputeTransferDeadlineInput,
): Date {
  const freshMs = input.now.getTime() + input.decisionWindowHours * HOUR_MS
  const cutoffMs = input.shiftStartAt.getTime() - HOUR_MS
  const candidate = Math.min(freshMs, cutoffMs)
  const floor = input.now.getTime() + MIN_WINDOW_MS
  return new Date(Math.max(candidate, floor))
}
