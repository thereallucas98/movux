import type { Role } from '@movux/auth'
import { env } from '@movux/env'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export type JwtPayload = {
  sub: string // userId
  role: Role
}

function requireJwtSecret(): string {
  if (!env.JWT_SECRET) throw new Error('Missing JWT_SECRET')
  return env.JWT_SECRET
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, requireJwtSecret(), { expiresIn: '7d' })
}

export function generateToken(): { raw: string; hashed: string } {
  const raw = randomBytes(32).toString('hex')
  const hashed = createHash('sha256').update(raw).digest('hex')
  return { raw, hashed }
}

export function signEmailVerifyToken(userId: string): string {
  return jwt.sign(
    { sub: userId, purpose: 'email_verify' },
    requireJwtSecret(),
    { expiresIn: '24h' },
  )
}

export function verifyEmailVerifyToken(
  token: string,
): { userId: string } | null {
  try {
    if (!env.JWT_SECRET) return null
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub: string
      purpose: string
    }
    if (payload.purpose !== 'email_verify') return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}
