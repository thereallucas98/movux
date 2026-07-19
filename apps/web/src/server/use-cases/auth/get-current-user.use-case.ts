import type { UserRepository } from '../../repositories/user.repository'

export type GetCurrentUserResult =
  | {
      success: true
      user: {
        id: string
        email: string
        fullName: string
        role: string
        avatarUrl: string | null
        createdAt: Date
      }
    }
  | { success: false; code: 'NOT_FOUND' }

export async function getCurrentUser(
  userRepo: UserRepository,
  userId: string,
): Promise<GetCurrentUserResult> {
  const user = await userRepo.findById(userId)
  if (!user) {
    return { success: false, code: 'NOT_FOUND' }
  }
  return { success: true, user }
}
