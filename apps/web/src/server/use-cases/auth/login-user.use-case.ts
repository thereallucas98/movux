import { signAccessToken, verifyPassword } from '~/lib/auth'
import type { UserRepository } from '../../repositories/user.repository'

export interface LoginUserInput {
  email: string
  password: string
}

export type LoginUserResult =
  | {
      success: true
      user: {
        id: string
        email: string
        fullName: string
        role: string
      }
      token: string
    }
  | { success: false; code: 'INVALID_CREDENTIALS' }

export async function loginUser(
  userRepo: UserRepository,
  input: LoginUserInput,
): Promise<LoginUserResult> {
  const user = await userRepo.findByEmailForLogin(input.email)

  if (!user || !user.isActive) {
    return { success: false, code: 'INVALID_CREDENTIALS' }
  }

  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) {
    return { success: false, code: 'INVALID_CREDENTIALS' }
  }

  const token = signAccessToken({
    sub: user.id,
    role: user.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
  })

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    token,
  }
}
