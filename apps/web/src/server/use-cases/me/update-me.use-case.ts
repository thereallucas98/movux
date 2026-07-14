import { prisma } from '~/lib/db'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  UserProfile,
  UserRepository,
} from '~/server/repositories/user.repository'

export interface UpdateMeInput {
  userId: string
  fullName?: string
  phone?: string | null
  avatarUrl?: string | null
  dateOfBirth?: Date | null
  bio?: string | null
  whatsappOptIn?: boolean
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
}

export type UpdateMeResult = {
  success: true
  data: UserProfile
}

export async function updateMe(
  userRepo: UserRepository,
  auditRepo: AuditLogRepository,
  input: UpdateMeInput,
): Promise<UpdateMeResult> {
  const { userId, ...data } = input

  const result = await prisma.$transaction(async (tx) => {
    const updated = await userRepo.updateProfile(userId, data, tx)
    await auditRepo.log(
      {
        actorUserId: userId,
        action: 'USER_PROFILE_UPDATED',
        entityType: 'USER',
        entityId: userId,
        metadata: {
          fields: Object.keys(data),
        },
      },
      tx,
    )
    return updated
  })

  return { success: true, data: result }
}
