import { env } from '@movux/env'
import { signEmailVerifyToken } from '~/lib/auth'
import { getEmailClient } from '~/lib/email/client'
import { VerifyEmail } from '~/lib/email/templates/verify-email'
import type { UserRepository } from '../../repositories/user.repository'

export interface ResendVerificationInput {
  userId: string
}

export type ResendVerificationResult =
  | { success: true }
  | { success: false; code: 'ALREADY_VERIFIED' }

export async function resendVerification(
  userRepo: UserRepository,
  input: ResendVerificationInput,
): Promise<ResendVerificationResult> {
  const user = await userRepo.findEmailVerifiedById(input.userId)
  if (!user) {
    return { success: false, code: 'ALREADY_VERIFIED' }
  }

  if (user.emailVerified) {
    return { success: false, code: 'ALREADY_VERIFIED' }
  }

  const token = signEmailVerifyToken(user.id)
  await getEmailClient().send({
    to: user.email,
    subject: 'Verifique seu email — Movux',
    react: VerifyEmail({ token, appUrl: env.APP_URL }),
  })

  return { success: true }
}
