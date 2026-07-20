import { verifyEmailVerificationToken } from '~/lib/auth'
import type { UserRepository } from '../../repositories/user.repository'

export type VerifyEmailResult =
  | { success: true }
  | { success: false; code: 'VALIDATION_ERROR' }

export async function verifyEmail(
  userRepo: UserRepository,
  token: string,
): Promise<VerifyEmailResult> {
  const decoded = verifyEmailVerificationToken(token)
  if (!decoded) {
    return { success: false, code: 'VALIDATION_ERROR' }
  }

  await userRepo.markEmailVerified(decoded.userId)

  return { success: true }
}
