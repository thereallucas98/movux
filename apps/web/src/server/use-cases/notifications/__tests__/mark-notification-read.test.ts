import { describe, expect, it, vi } from 'vitest'

import { markNotificationRead } from '../mark-notification-read.use-case'
import { makeNotificationRepoMock } from '../../__tests__/helpers'

const principal = { userId: 'u-1', role: 'USER' }
const NOTIF_ID = 'n-1'

const baseRow = {
  id: NOTIF_ID,
  userId: 'u-1',
  workspaceId: 'ws-1',
  type: 'ASSIGNMENT_CREATED' as const,
  payload: {},
  readAt: null,
  createdAt: new Date('2026-04-30T10:00:00Z'),
}

describe('markNotificationRead', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await markNotificationRead(makeNotificationRepoMock(), null, {
      id: NOTIF_ID,
    })
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('NOT_FOUND when notif id does not belong to principal (cross-user)', async () => {
    const r = await markNotificationRead(
      makeNotificationRepoMock({
        findByIdForUser: vi.fn().mockResolvedValue(null),
      }),
      principal,
      { id: NOTIF_ID },
    )
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('happy path flips readAt', async () => {
    const markRead = vi
      .fn()
      .mockResolvedValue({ ...baseRow, readAt: new Date() })
    const r = await markNotificationRead(
      makeNotificationRepoMock({
        findByIdForUser: vi.fn().mockResolvedValue(baseRow),
        markRead,
      }),
      principal,
      { id: NOTIF_ID },
    )
    expect(r.success).toBe(true)
    expect(markRead).toHaveBeenCalledWith(NOTIF_ID)
  })

  it('idempotent: already-read returns existing without re-marking', async () => {
    const markRead = vi.fn()
    const alreadyRead = { ...baseRow, readAt: new Date('2026-04-30T11:00:00Z') }
    const r = await markNotificationRead(
      makeNotificationRepoMock({
        findByIdForUser: vi.fn().mockResolvedValue(alreadyRead),
        markRead,
      }),
      principal,
      { id: NOTIF_ID },
    )
    expect(r.success).toBe(true)
    expect(markRead).not.toHaveBeenCalled()
  })
})
