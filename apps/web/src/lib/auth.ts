import type { Role } from '@movux/auth'
import { env } from '@movux/env'
import bcrypt from 'bcryptjs'
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
