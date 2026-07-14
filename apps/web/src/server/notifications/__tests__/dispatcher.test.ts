import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dispatch } from '../dispatcher'
import {
  makeNotificationPreferenceRepoMock,
  makeNotificationRepoMock,
} from '~/server/use-cases/__tests__/helpers'
import type { AssignmentCreatedPayload } from '../payloads'

const samplePayload: AssignmentCreatedPayload = {
  entityType: 'ASSIGNMENT',
  entityId: 'asg-1',
  actorUserId: 'u-admin',
  shiftId: 'shift-1',
  scheduleId: 'sch-1',
  shiftStartAt: '2026-05-01T08:00:00Z',
  shiftEndAt: '2026-05-01T17:00:00Z',
  categoryId: 'cat-1',
  decisionDeadline: '2026-04-30T20:00:00Z',
  autoAccepted: false,
}

describe('dispatch', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('no-op when recipientUserIds is empty', async () => {
    const createMany = vi.fn()
    await dispatch(
      {
        notificationRepo: makeNotificationRepoMock({ createMany }),
        notificationPreferenceRepo: makeNotificationPreferenceRepoMock(),
      },
      {
        type: 'ASSIGNMENT_CREATED',
        payload: samplePayload,
        workspaceId: 'ws-1',
        recipientUserIds: [],
      },
    )
    expect(createMany).not.toHaveBeenCalled()
  })

  it('writes 1 in-app row per recipient when no overrides exist', async () => {
    const createMany = vi.fn().mockResolvedValue(3)
    await dispatch(
      {
        notificationRepo: makeNotificationRepoMock({ createMany }),
        notificationPreferenceRepo: makeNotificationPreferenceRepoMock(),
      },
      {
        type: 'ASSIGNMENT_CREATED',
        payload: samplePayload,
        workspaceId: 'ws-1',
        recipientUserIds: ['u-1', 'u-2', 'u-3'],
      },
    )
    expect(createMany).toHaveBeenCalledTimes(1)
    const rows = createMany.mock.calls[0]?.[0]
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      type: 'ASSIGNMENT_CREATED',
      workspaceId: 'ws-1',
    })
  })

  it('skips IN_APP when user opted out for that type', async () => {
    const createMany = vi.fn().mockResolvedValue(0)
    await dispatch(
      {
        notificationRepo: makeNotificationRepoMock({ createMany }),
        notificationPreferenceRepo: makeNotificationPreferenceRepoMock({
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
      },
      {
        type: 'ASSIGNMENT_CREATED',
        payload: samplePayload,
        workspaceId: 'ws-1',
        recipientUserIds: ['u-1'],
      },
    )
    // No IN_APP row to persist for u-1.
    const rows = createMany.mock.calls[0]?.[0] ?? []
    expect(rows).toHaveLength(0)
  })

  it('dedupes duplicate recipient ids', async () => {
    const createMany = vi.fn().mockResolvedValue(1)
    await dispatch(
      {
        notificationRepo: makeNotificationRepoMock({ createMany }),
        notificationPreferenceRepo: makeNotificationPreferenceRepoMock(),
      },
      {
        type: 'ASSIGNMENT_CREATED',
        payload: samplePayload,
        workspaceId: 'ws-1',
        recipientUserIds: ['u-1', 'u-1', 'u-1'],
      },
    )
    const rows = createMany.mock.calls[0]?.[0] ?? []
    expect(rows).toHaveLength(1)
  })

  it('adapter failure does not throw to caller', async () => {
    const createMany = vi.fn().mockRejectedValue(new Error('boom'))
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      dispatch(
        {
          notificationRepo: makeNotificationRepoMock({ createMany }),
          notificationPreferenceRepo: makeNotificationPreferenceRepoMock(),
        },
        {
          type: 'ASSIGNMENT_CREATED',
          payload: samplePayload,
          workspaceId: 'ws-1',
          recipientUserIds: ['u-1'],
        },
      ),
    ).resolves.toBeUndefined()
    expect(consoleErr).toHaveBeenCalled()
  })
})
