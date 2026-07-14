/**
 * Pure helpers for tolerance + overtime math (Task 13 research §2).
 *
 * Tolerance is symmetric (Q8 Fast): a clock is "within tolerance" iff its
 * absolute distance to the anchor is ≤ toleranceMinutes (inclusive on both
 * edges). The anchor is the shift's startAt for clock-in, endAt for clock-out.
 *
 * Overtime is non-negative (early clock-out → 0); rounding via Math.ceil so
 * any sliver past endAt counts as 1 minute of overtime.
 */

export interface IsWithinToleranceInput {
  actualAt: Date
  anchorAt: Date
  toleranceMinutes: number
}

export function isWithinTolerance(input: IsWithinToleranceInput): boolean {
  const deltaMs = Math.abs(input.actualAt.getTime() - input.anchorAt.getTime())
  const toleranceMs = input.toleranceMinutes * 60_000
  return deltaMs <= toleranceMs
}

export interface ComputeOvertimeMinutesInput {
  clockOutAt: Date
  shiftEndAt: Date
}

export function computeOvertimeMinutes(
  input: ComputeOvertimeMinutesInput,
): number {
  const diffSec = Math.floor(
    (input.clockOutAt.getTime() - input.shiftEndAt.getTime()) / 1000,
  )
  if (diffSec <= 0) return 0
  return Math.ceil(diffSec / 60)
}
