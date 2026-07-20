import { env } from '@movux/env'
import { hashPassword, signAccessToken, signEmailVerificationToken } from '~/lib/auth'
import { VerifyEmail } from '~/lib/email/templates/verify-email'
import { sendEmailNotification } from '../../notifications/send-email-notification'
import type { NotificationLogRepository } from '../../repositories/notification-log.repository'
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

interface RegisterUserRepos {
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function registerUser(
  repos: RegisterUserRepos,
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  const { userRepo } = repos
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

  const verificationToken = signEmailVerificationToken(user.id)
  await sendEmailNotification(repos.notificationLogRepo, {
    userId: user.id,
    to: user.email,
    subject: 'Verifique seu email — Movux',
    react: VerifyEmail({ token: verificationToken, appUrl: env.APP_URL }),
    templateCode: 'EMAIL_VERIFICATION',
  })

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
