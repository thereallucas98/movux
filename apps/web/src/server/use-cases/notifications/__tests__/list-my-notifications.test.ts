import { describe, expect, it, vi } from 'vitest'

import { listMyNotifications } from '../list-my-notifications.use-case'
import { makeNotificationRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }

describe('listMyNotifications', () => {
  it('UNAUTHENTICATED when principal is null', async () => {
    const r = await listMyNotifications(makeNotificationRepoMock(), null, {})
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('passes status=all by default + clamps limit to [1, 200]', async () => {
    const listForUser = vi
      .fn()
      .mockResolvedValue({ data: [], nextCursor: null })
    await listMyNotifications(
      makeNotificationRepoMock({ listForUser }),
      principal,
      { limit: 9999 },
    )
    expect(listForUser).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'all', limit: 200, userId: 'u-1' }),
    )
  })

  it('passes status=unread through', async () => {
    const listForUser = vi
      .fn()
      .mockResolvedValue({ data: [], nextCursor: null })
    await listMyNotifications(
      makeNotificationRepoMock({ listForUser }),
      principal,
      { status: 'unread', limit: 10 },
    )
    expect(listForUser).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unread', limit: 10 }),
    )
  })

  it('returns data + nextCursor from repo', async () => {
    const data = [
      {
        id: 'n-1',
        userId: 'u-1',
        workspaceId: 'ws-1',
        type: 'ASSIGNMENT_CREATED' as const,
        payload: {},
        readAt: null,
        createdAt: new Date(),
      },
    ]
    const r = await listMyNotifications(
      makeNotificationRepoMock({
        listForUser: vi.fn().mockResolvedValue({ data, nextCursor: 'cur-2' }),
      }),
      principal,
      {},
    )
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toBe(data)
      expect(r.nextCursor).toBe('cur-2')
    }
  })
})
