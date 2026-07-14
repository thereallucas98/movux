import { hashPassword, verifyPassword } from '~/lib/auth'
import type { UserRepository } from '../../repositories/user.repository'

export interface ChangePasswordInput {
  userId: string
  email: string
  currentPassword: string
  newPassword: string
}

export type ChangePasswordResult =
  | { success: true }
  | { success: false; code: 'WRONG_PASSWORD' }

export async function changePassword(
  userRepo: UserRepository,
  input: ChangePasswordInput,
): Promise<ChangePasswordResult> {
  const user = await userRepo.findByEmailForLogin(input.email)
  if (!user) {
    return { success: false, code: 'WRONG_PASSWORD' }
  }

  const ok = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!ok) {
    return { success: false, code: 'WRONG_PASSWORD' }
  }

  const passwordHash = await hashPassword(input.newPassword)
  await userRepo.updatePassword(input.userId, passwordHash)

  return { success: true }
}
