import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'

export interface ProfileContext {
  principal: { userId: string; role: string }
}

export async function resolveProfileContext(): Promise<ProfileContext> {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')
  return {
    principal: { userId: principal.userId, role: principal.role },
  }
}
