/**
 * Convert a PT-BR-ish display name into a URL-safe slug matching the backend
 * regex `^[a-z0-9][a-z0-9-]{0,49}$`.
 *
 * Steps: NFD-decompose → drop diacritic combining marks → lowercase → replace
 * non-alphanumeric runs with single hyphens → trim leading/trailing hyphens →
 * cap at 50 chars. Falls back to `'item'` when the result is empty (e.g. all
 * symbols), so the backend never receives an invalid empty slug.
 */
export function slugify(input: string): string {
  const stripped = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return stripped.length === 0 ? 'item' : stripped
}
