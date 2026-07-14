import { env } from '@movux/env'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '~/lib/auth'

export function getAccessTokenFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null

  // cookie header: "a=b; session=xxx; c=d"
  const parts = cookieHeader.split(';').map((p) => p.trim())
  const found = parts.find((p) => p.startsWith('session='))
  if (!found) return null

  const value = found.slice('session='.length)
  return value || null
}

export function verifyAccessToken(token: string): JwtPayload {
  if (!env.JWT_SECRET) throw new Error('Missing JWT_SECRET')
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
  return decoded
}
