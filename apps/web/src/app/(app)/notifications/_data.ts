import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'

export interface NotificationsContext {
  principal: { userId: string; role: string }
}

export async function resolveNotificationsContext(): Promise<NotificationsContext> {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')
  return {
    principal: { userId: principal.userId, role: principal.role },
  }
}
