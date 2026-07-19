import { prisma } from '~/lib/db'
import { getAccessTokenFromCookie, verifyAccessToken } from '~/lib/session'

export async function getPrincipal(req: Request) {
  const token = getAccessTokenFromCookie(req.headers.get('cookie'))
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
      role: user.role,
    }
  } catch {
    return null
  }
}
