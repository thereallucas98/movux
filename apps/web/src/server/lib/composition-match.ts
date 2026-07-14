/**
 * Composition match calculator.
 *
 * Computes whether a user's specialty matches the shift's expected composition.
 * Returns:
 * - `MATCH`     — user has a specialty listed in the composition
 * - `MISMATCH`  — user has a specialty but it's not in the composition
 * - `UNKNOWN`   — composition is empty OR user has no specialty in the workspace
 *
 * Pure function — no DB or repos. Tested in isolation.
 */

export type CompositionStatus = 'MATCH' | 'MISMATCH' | 'UNKNOWN'

export function computeCompositionStatus(
  userSpecialty: { specialtyId: string } | null | undefined,
  composition: { specialtyId: string }[],
): CompositionStatus {
  if (composition.length === 0) return 'UNKNOWN'
  if (!userSpecialty) return 'UNKNOWN'
  return composition.some((c) => c.specialtyId === userSpecialty.specialtyId)
    ? 'MATCH'
    : 'MISMATCH'
}
