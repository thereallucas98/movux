'use client'

import { useMutation } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const res = await fetch('/api/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) throw await ApiError.fromResponse(res)
      return res.json()
    },
    meta: { silent: true },
  })
}
