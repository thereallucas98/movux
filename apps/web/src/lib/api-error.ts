/**
 * Lightweight error class for REST endpoints. Wraps the standard error body
 * shape `{ message, code, details?, meta? }` produced by `server/http/error-response`.
 *
 * `meta` is a structured payload reserved for codes that need to carry
 * domain-specific context to the UI (e.g., `PLAN_LIMIT_REACHED` carries
 * `{ shape, resource, limit, current, plan, gracePeriodExpired? }`).
 */
export class ApiError extends Error {
  status: number
  code: string | null
  meta: unknown

  constructor(
    status: number,
    message: string,
    code: string | null = null,
    meta: unknown = undefined,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.meta = meta
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    const body = (await res.json().catch(() => null)) as {
      message?: string
      code?: string
      meta?: unknown
    } | null
    return new ApiError(
      res.status,
      body?.message ?? `Request failed (${res.status})`,
      body?.code ?? null,
      body?.meta,
    )
  }
}
