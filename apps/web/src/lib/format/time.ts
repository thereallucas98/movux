/**
 * Convert "HH:mm" to minutes-from-midnight (0..1439).
 * Returns 0 for malformed input — callers should validate the format separately.
 */
export function toMinutes(hhmm: string): number {
  const [hh, mm] = hhmm.split(':').map(Number)
  const safeHh = Number.isFinite(hh) ? hh : 0
  const safeMm = Number.isFinite(mm) ? mm : 0
  return safeHh * 60 + safeMm
}

/** Convert minutes-from-midnight (0..1439) to a zero-padded "HH:mm" string. */
export function fromMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)))
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0')
  const mm = String(clamped % 60).padStart(2, '0')
  return `${hh}:${mm}`
}
