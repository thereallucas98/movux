import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'
import { userRepository } from '~/server/repositories'
import { getCurrentUser } from '~/server/use-cases'

/**
 * Server Component guard for role-based layouts. Role correctness is
 * already enforced by middleware — this only re-fetches the authenticated
 * user for display and redirects to /login if the session is somehow gone
 * (e.g. user deleted between middleware and render).
 */
export async function requireMe() {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')

  const result = await getCurrentUser(userRepository, principal.userId)
  if (!result.success) redirect('/login')

  return result.user
}
