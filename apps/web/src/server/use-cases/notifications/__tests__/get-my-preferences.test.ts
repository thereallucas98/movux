import { describe, expect, it, vi } from 'vitest'

import { getMyNotificationPreferences } from '../get-my-preferences.use-case'
import { makeNotificationPreferenceRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }

describe('getMyNotificationPreferences', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await getMyNotificationPreferences(
      makeNotificationPreferenceRepoMock(),
      null,
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns full grid (16 types × 4 channels = 64) with channel defaults', async () => {
    const r = await getMyNotificationPreferences(
      makeNotificationPreferenceRepoMock(),
      principal,
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toHaveLength(64)
      // Default WHATSAPP=false, IN_APP=true
      const inApp = r.data.find(
        (p) => p.type === 'ASSIGNMENT_CREATED' && p.channel === 'IN_APP',
      )
      const whatsapp = r.data.find(
        (p) => p.type === 'ASSIGNMENT_CREATED' && p.channel === 'WHATSAPP',
      )
      expect(inApp?.enabled).toBe(true)
      expect(whatsapp?.enabled).toBe(false)
    }
  })

  it('overlays explicit stored prefs over defaults', async () => {
    const r = await getMyNotificationPreferences(
      makeNotificationPreferenceRepoMock({
        listForUser: vi.fn().mockResolvedValue([
          {
            id: 'p-1',
            userId: 'u-1',
            type: 'ASSIGNMENT_CREATED',
            channel: 'IN_APP',
            enabled: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
      principal,
    )
    expect(r.success).toBe(true)
    if (r.success) {
      const overridden = r.data.find(
        (p) => p.type === 'ASSIGNMENT_CREATED' && p.channel === 'IN_APP',
      )
      expect(overridden?.enabled).toBe(false)
    }
  })
})
