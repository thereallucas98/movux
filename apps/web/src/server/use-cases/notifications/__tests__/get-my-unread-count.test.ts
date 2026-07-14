import { describe, expect, it, vi } from 'vitest'

import { getMyUnreadNotificationCount } from '../get-my-unread-count.use-case'
import { makeNotificationRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }

describe('getMyUnreadNotificationCount', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await getMyUnreadNotificationCount(
      makeNotificationRepoMock(),
      null,
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns count from repo for principal user', async () => {
    const countUnreadForUser = vi.fn().mockResolvedValue(7)
    const r = await getMyUnreadNotificationCount(
      makeNotificationRepoMock({ countUnreadForUser }),
      principal,
    )
    expect(r).toEqual({ success: true, count: 7 })
    expect(countUnreadForUser).toHaveBeenCalledWith('u-1')
  })
})
