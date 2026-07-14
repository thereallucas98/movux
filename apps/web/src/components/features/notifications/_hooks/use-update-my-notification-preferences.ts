'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '~/lib/api-error'

import type { PreferenceItem } from './use-my-notification-preferences'

interface UpdatePayload {
  updates: PreferenceItem[]
}

async function updatePreferences(
  payload: UpdatePayload,
): Promise<PreferenceItem[]> {
  const res = await fetch('/api/me/notification-preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  const body = (await res.json()) as { data: PreferenceItem[] }
  return body.data
}

export function useUpdateMyNotificationPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['my-notification-preferences'], data)
      toast.success('Preferências atualizadas.')
    },
    onError: () => {
      toast.error('Não foi possível atualizar as preferências.')
    },
    meta: { silent: true },
  })
}
