'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'

export interface MeProfile {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  emailVerified: boolean
  phone: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  bio: string | null
  whatsappOptIn: boolean
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  createdAt: string
  updatedAt: string
}

interface MeResponse {
  user: MeProfile
}

async function fetchMe(): Promise<MeProfile> {
  const res = await fetch('/api/me', { credentials: 'include' })
  if (!res.ok) throw await ApiError.fromResponse(res)
  const json = (await res.json()) as MeResponse
  return json.user
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    meta: { silent: true },
  })
}
