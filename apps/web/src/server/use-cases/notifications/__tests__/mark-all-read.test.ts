import { describe, expect, it, vi } from 'vitest'

import { markAllMyNotificationsRead } from '../mark-all-read.use-case'
import { makeNotificationRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }

describe('markAllMyNotificationsRead', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await markAllMyNotificationsRead(makeNotificationRepoMock(), null)
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns updated count from repo', async () => {
    const markAllReadForUser = vi.fn().mockResolvedValue(3)
    const r = await markAllMyNotificationsRead(
      makeNotificationRepoMock({ markAllReadForUser }),
      principal,
    )
    expect(r).toEqual({ success: true, updated: 3 })
    expect(markAllReadForUser).toHaveBeenCalledWith('u-1')
  })

  it('returns updated=0 no-op when nothing unread', async () => {
    const r = await markAllMyNotificationsRead(
      makeNotificationRepoMock({
        markAllReadForUser: vi.fn().mockResolvedValue(0),
      }),
      principal,
    )
    expect(r).toEqual({ success: true, updated: 0 })
  })
})
