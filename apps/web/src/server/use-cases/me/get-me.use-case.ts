import type {
  UserProfile,
  UserRepository,
} from '../../repositories/user.repository'

export type GetMeResult =
  | {
      success: true
      user: UserProfile
    }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function getMe(
  userRepo: UserRepository,
  userId: string,
): Promise<GetMeResult> {
  const user = await userRepo.findByIdForMe(userId)

  if (!user || !user.isActive) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  return { success: true, user }
}
