import { cookies } from 'next/headers'
import { prisma } from '~/lib/db'
import { verifyAccessToken } from '~/lib/session'

/**
 * Reads the auth cookie from Next.js headers — for use in Server Components and layouts.
 * API routes should continue using getPrincipal(req) from ~/lib/get-principal.
 */
export async function getServerPrincipal() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  try {
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        deletedAt: true,
      },
    })

    if (!user || user.deletedAt) return null

    return {
      userId: user.id,
      role: user.role as string,
    }
  } catch {
    return null
  }
}
