import { hashPassword, signAccessToken } from '~/lib/auth'
import type { UserRepository } from '../../repositories/user.repository'

export interface RegisterUserInput {
  fullName: string
  email: string
  password: string
  role: 'CUSTOMER' | 'CARRIER'
  phone?: string
}

export type RegisterUserResult =
  | {
      success: true
      user: { id: string; fullName: string; email: string; role: string }
      token: string
    }
  | { success: false; code: 'EMAIL_IN_USE' }

export async function registerUser(
  userRepo: UserRepository,
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  const existing = await userRepo.findByEmail(input.email)
  if (existing) {
    return { success: false, code: 'EMAIL_IN_USE' }
  }

  const passwordHash = await hashPassword(input.password)

  const user =
    input.role === 'CARRIER'
      ? await userRepo.createCarrier({
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          phone: input.phone as string,
        })
      : await userRepo.createCustomer({
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          phone: input.phone,
        })

  const token = signAccessToken({ sub: user.id, role: user.role })

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
