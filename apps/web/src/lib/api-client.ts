/**
 * Typed HTTP client for internal API calls.
 *
 * Handles credentials, JSON serialization, and error extraction
 * so pages don't repeat boilerplate fetch logic.
 *
 * @example
 * // GET
 * const data = await api.get<MeResponse>('/api/me')
 *
 * // POST with body
 * const result = await api.post<{ token: string }>('/api/auth/login', { email, password })
 *
 * // PATCH
 * await api.patch('/api/me', { fullName: 'New name' })
 *
 * // DELETE
 * await api.delete('/api/some/resource/123')
 */

class ApiClientError extends Error {
  status: number
  code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
  }
}

async function request<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.message ?? `Request failed (${res.status})`
    const code = body?.code ?? null
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('movux:401'))
    }
    throw new ApiClientError(message, res.status, code)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const api = {
  get<T = unknown>(url: string): Promise<T> {
    return request<T>(url)
  },

  post<T = unknown>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  patch<T = unknown>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  delete<T = unknown>(url: string): Promise<T> {
    return request<T>(url, { method: 'DELETE' })
  },
}

export { ApiClientError }
