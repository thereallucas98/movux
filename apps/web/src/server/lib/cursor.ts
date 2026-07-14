/**
 * Opaque cursor for stable pagination.
 *
 * Generic shape: any record encodes to a base64url JSON blob; callers pass a
 * type predicate to validate on decode. Keeps the cursor opaque to clients
 * while letting each repo pick its ordering key.
 *
 * Two stock shapes ship out of the box:
 *   - `CreatedAtCursor` (paired with `isCreatedAtCursor`) for `ORDER BY createdAt DESC, id DESC`
 *   - `StartAtCursor`   (paired with `isStartAtCursor`)   for `ORDER BY startAt ASC, id ASC`
 */

export interface CreatedAtCursor {
  /** ISO-8601 date-time string (from `Date.prototype.toISOString()`) */
  createdAt: string
  /** Record primary key */
  id: string
}

export interface StartAtCursor {
  /** ISO-8601 date-time string (from `Date.prototype.toISOString()`) */
  startAt: string
  /** Record primary key */
  id: string
}

/** Backward-compat alias used by existing repos. */
export type Cursor = CreatedAtCursor

export function encodeCursor<T extends object>(cursor: T): string {
  const json = JSON.stringify(cursor)
  return Buffer.from(json, 'utf-8').toString('base64url')
}

/**
 * Decodes a cursor and validates its shape via a type predicate.
 *
 * Default validator (no `validator` arg) accepts `CreatedAtCursor` for backward
 * compatibility with the original signature.
 */
export function decodeCursor(
  encoded: string | null | undefined,
): CreatedAtCursor | null
export function decodeCursor<T extends object>(
  encoded: string | null | undefined,
  validator: (parsed: unknown) => parsed is T,
): T | null
export function decodeCursor<T extends object>(
  encoded: string | null | undefined,
  validator?: (parsed: unknown) => parsed is T,
): T | CreatedAtCursor | null {
  if (!encoded) return null
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8')
    const parsed: unknown = JSON.parse(json)
    if (validator) {
      return validator(parsed) ? parsed : null
    }
    return isCreatedAtCursor(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function isCreatedAtCursor(parsed: unknown): parsed is CreatedAtCursor {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    typeof (parsed as { createdAt?: unknown }).createdAt === 'string' &&
    typeof (parsed as { id?: unknown }).id === 'string'
  )
}

export function isStartAtCursor(parsed: unknown): parsed is StartAtCursor {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    typeof (parsed as { startAt?: unknown }).startAt === 'string' &&
    typeof (parsed as { id?: unknown }).id === 'string'
  )
}
