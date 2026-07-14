import { env } from '@movux/env'
import { generateToken } from '~/lib/auth'
import { getEmailClient } from '~/lib/email/client'
import { ResetPassword } from '~/lib/email/templates/reset-password'
import type { UserRepository } from '../../repositories/user.repository'

export interface ForgotPasswordInput {
  email: string
}

export type ForgotPasswordResult = { success: true }

export async function forgotPassword(
  userRepo: UserRepository,
  input: ForgotPasswordInput,
): Promise<ForgotPasswordResult> {
  const user = await userRepo.findByEmail(input.email)

  if (user) {
    const { raw, hashed } = generateToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await userRepo.setResetToken(user.id, hashed, expiresAt)

    try {
      await getEmailClient().send({
        to: input.email,
        subject: 'Redefinir senha — Movux',
        react: ResetPassword({ token: raw, appUrl: env.APP_URL }),
      })
    } catch (error) {
      // Never leak whether the email exists. Log server-side and continue.
      console.error('[forgot-password] failed to send reset email', error)
    }
  }

  // Always succeed — never reveal whether email exists
  return { success: true }
}
