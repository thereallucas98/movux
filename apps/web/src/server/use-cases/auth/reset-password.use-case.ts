import { createHash } from 'crypto'
import { hashPassword } from '~/lib/auth'
import type { UserRepository } from '../../repositories/user.repository'

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

export type ResetPasswordResult =
  | { success: true }
  | { success: false; code: 'INVALID_OR_EXPIRED_TOKEN' }

export async function resetPassword(
  userRepo: UserRepository,
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  const hashed = createHash('sha256').update(input.token).digest('hex')
  const user = await userRepo.findByResetToken(hashed)

  if (!user) {
    return { success: false, code: 'INVALID_OR_EXPIRED_TOKEN' }
  }

  if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return { success: false, code: 'INVALID_OR_EXPIRED_TOKEN' }
  }

  const passwordHash = await hashPassword(input.newPassword)
  await userRepo.updatePassword(user.id, passwordHash)
  await userRepo.clearResetToken(user.id)

  return { success: true }
}
