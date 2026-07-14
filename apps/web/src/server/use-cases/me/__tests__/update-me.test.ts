import { describe, expect, it, vi } from 'vitest'

import { updateMe } from '../update-me.use-case'
import { makeAuditRepoMock, makeUserRepoMock } from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}))

const USER_ID = 'user-1'

const baseProfile = {
  id: USER_ID,
  fullName: 'Old Name',
  email: 'user@movux.test',
  role: 'USER',
  isActive: true,
  emailVerified: true,
  phone: null,
  avatarUrl: null,
  dateOfBirth: null,
  bio: null,
  whatsappOptIn: false,
  emergencyContactName: null,
  emergencyContactPhone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('updateMe', () => {
  it('updates fullName + writes audit log', async () => {
    const updated = { ...baseProfile, fullName: 'New Name' }
    const userRepo = makeUserRepoMock({
      updateProfile: vi.fn().mockResolvedValue(updated),
    })
    const auditRepo = makeAuditRepoMock()

    const result = await updateMe(userRepo, auditRepo, {
      userId: USER_ID,
      fullName: 'New Name',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.fullName).toBe('New Name')
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_PROFILE_UPDATED',
        entityType: 'USER',
        entityId: USER_ID,
      }),
      expect.any(Object),
    )
  })

  it('passes only provided fields to the repo (conditional spread)', async () => {
    const userRepo = makeUserRepoMock({
      updateProfile: vi.fn().mockResolvedValue(baseProfile),
    })
    await updateMe(userRepo, makeAuditRepoMock(), {
      userId: USER_ID,
      bio: 'New bio',
      whatsappOptIn: true,
    })
    expect(userRepo.updateProfile).toHaveBeenCalledWith(
      USER_ID,
      { bio: 'New bio', whatsappOptIn: true },
      expect.any(Object),
    )
  })

  it('handles dateOfBirth + emergency contact update', async () => {
    const date = new Date('1990-01-15')
    const updated = {
      ...baseProfile,
      dateOfBirth: date,
      emergencyContactName: 'Mãe',
      emergencyContactPhone: '+5511999998888',
    }
    const userRepo = makeUserRepoMock({
      updateProfile: vi.fn().mockResolvedValue(updated),
    })
    const result = await updateMe(userRepo, makeAuditRepoMock(), {
      userId: USER_ID,
      dateOfBirth: date,
      emergencyContactName: 'Mãe',
      emergencyContactPhone: '+5511999998888',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dateOfBirth).toEqual(date)
      expect(result.data.emergencyContactPhone).toBe('+5511999998888')
    }
  })
})
