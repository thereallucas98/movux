import { verifyEmailVerifyToken } from '~/lib/auth'
import type { UserRepository } from '../../repositories/user.repository'

export interface VerifyEmailInput {
  token: string
}

export type VerifyEmailResult =
  | { success: true }
  | { success: false; code: 'INVALID_OR_EXPIRED_TOKEN' | 'ALREADY_VERIFIED' }

export async function verifyEmail(
  userRepo: UserRepository,
  input: VerifyEmailInput,
): Promise<VerifyEmailResult> {
  const payload = verifyEmailVerifyToken(input.token)
  if (!payload) {
    return { success: false, code: 'INVALID_OR_EXPIRED_TOKEN' }
  }

  const user = await userRepo.findEmailVerifiedById(payload.userId)
  if (!user) {
    return { success: false, code: 'INVALID_OR_EXPIRED_TOKEN' }
  }

  if (user.emailVerified) {
    return { success: false, code: 'ALREADY_VERIFIED' }
  }

  await userRepo.setEmailVerified(user.id)
  return { success: true }
}
