import { PUBLIC_REGISTRABLE_ROLES } from '@movux/auth'
import { env } from '@movux/env'
import { hashPassword, signAccessToken, signEmailVerifyToken } from '~/lib/auth'
import { getEmailClient } from '~/lib/email/client'
import { VerifyEmail } from '~/lib/email/templates/verify-email'
import type { UserRepository } from '../../repositories/user.repository'

export interface RegisterUserInput {
  fullName: string
  email: string
  password: string
  role: string
}

export type RegisterUserResult =
  | {
      success: true
      user: { id: string; fullName: string; email: string; role: string }
      token: string
    }
  | { success: false; code: 'EMAIL_IN_USE' | 'FORBIDDEN_ROLE' }

export async function registerUser(
  userRepo: UserRepository,
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  if (!PUBLIC_REGISTRABLE_ROLES.includes(input.role as 'USER')) {
    return { success: false, code: 'FORBIDDEN_ROLE' }
  }

  const existing = await userRepo.findByEmail(input.email)
  if (existing) {
    return { success: false, code: 'EMAIL_IN_USE' }
  }

  const passwordHash = await hashPassword(input.password)
  const user = await userRepo.create({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    role: input.role,
  })

  const token = signAccessToken({
    sub: user.id,
    role: user.role as 'USER',
  })

  const verifyToken = signEmailVerifyToken(user.id)
  try {
    await getEmailClient().send({
      to: user.email,
      subject: 'Verifique seu email — Movux',
      react: VerifyEmail({ token: verifyToken, appUrl: env.APP_URL }),
    })
  } catch (error) {
    console.error('[register-user] failed to send verification email', error)
  }

  return {
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    token,
  }
}
