'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

export interface UpdateMePatch {
  fullName?: string
  phone?: string | null
  avatarUrl?: string | null
  dateOfBirth?: string | null
  bio?: string | null
  whatsappOptIn?: boolean
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: UpdateMePatch) => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    meta: { silent: true },
  })
}
