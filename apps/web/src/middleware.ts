import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_PREFIXES: Record<string, string> = {
  '/customer': 'CUSTOMER',
  '/carrier': 'CARRIER',
  '/admin': 'ADMIN',
}

function dashboardForRole(role: string): string {
  if (role === 'CARRIER') return '/carrier/dashboard'
  if (role === 'ADMIN') return '/admin/dashboard'
  return '/customer/dashboard'
}

/**
 * Decode JWT payload without verification (Edge-compatible).
 * Full verification happens server-side in API routes / server components.
 * Middleware only needs role for route gating.
 */
function decodeJwtPayload(token: string): { sub: string; role: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.sub || !payload.role) return null
    return { sub: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  const pathname = req.nextUrl.pathname

  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = decodeJwtPayload(token)

  if (!payload) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix),
  )
  if (matchedPrefix && payload.role !== ROLE_PREFIXES[matchedPrefix]) {
    return NextResponse.redirect(
      new URL(dashboardForRole(payload.role), req.url),
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/customer/:path*', '/carrier/:path*', '/admin/:path*'],
}
