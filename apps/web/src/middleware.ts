import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']

/**
 * Decode JWT payload without verification (Edge-compatible).
 * Full verification happens server-side in API routes / context.
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

  if (pathname.startsWith('/admin')) {
    if (!ADMIN_ROLES.includes(payload.role)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/schedules/:path*',
    '/shifts/:path*',
    '/requests/:path*',
    '/time-tracking/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
  ],
}
