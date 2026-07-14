'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import {
  NOTIFICATION_CACHE_KEYS,
  patchOneAsRead,
  restoreSnapshot,
  takeSnapshot,
} from './_lib/notification-cache'
import type { NotificationRow } from './_lib/types'

async function markRead(id: string): Promise<NotificationRow> {
  const res = await fetch(`/api/me/notifications/${id}/read`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<NotificationRow>
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markRead,
    onMutate: async (id) => {
      const snapshot = takeSnapshot(queryClient)
      patchOneAsRead(queryClient, id, new Date())
      return { snapshot }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) restoreSnapshot(queryClient, ctx.snapshot)
      toast.error('Não foi possível marcar como lida.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: NOTIFICATION_CACHE_KEYS.unreadCount,
      })
    },
    meta: { silent: true },
  })
}
