import { describe, expect, it, vi } from 'vitest'

import { updateMyNotificationPreferences } from '../update-my-preferences.use-case'
import { makeNotificationPreferenceRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }

describe('updateMyNotificationPreferences', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await updateMyNotificationPreferences(
      makeNotificationPreferenceRepoMock(),
      null,
      { updates: [] },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('upserts updates and returns full preference grid', async () => {
    const upsertMany = vi.fn().mockResolvedValue([])
    const r = await updateMyNotificationPreferences(
      makeNotificationPreferenceRepoMock({ upsertMany }),
      principal,
      {
        updates: [
          { type: 'ASSIGNMENT_CREATED', channel: 'IN_APP', enabled: false },
          { type: 'TRANSFER_REQUESTED', channel: 'WHATSAPP', enabled: true },
        ],
      },
    )
    expect(upsertMany).toHaveBeenCalledWith(
      'u-1',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ASSIGNMENT_CREATED',
          channel: 'IN_APP',
          enabled: false,
        }),
      ]),
    )
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toHaveLength(64)
  })
})
