'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import {
  NOTIFICATION_CACHE_KEYS,
  patchAllAsRead,
  restoreSnapshot,
  takeSnapshot,
} from './_lib/notification-cache'

async function markAllRead(): Promise<{ updated: number }> {
  const res = await fetch('/api/me/notifications/read-all', {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<{ updated: number }>
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      const snapshot = takeSnapshot(queryClient)
      patchAllAsRead(queryClient, new Date())
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) restoreSnapshot(queryClient, ctx.snapshot)
      toast.error('Não foi possível marcar todas como lidas.')
    },
    onSuccess: (data) => {
      if (data.updated > 0) {
        toast.success(`Marcadas ${data.updated} como lidas.`)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: NOTIFICATION_CACHE_KEYS.unreadCount,
      })
    },
    meta: { silent: true },
  })
}
