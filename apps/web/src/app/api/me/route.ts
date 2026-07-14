import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { getAccessTokenFromCookie, verifyAccessToken } from '~/lib/session'
import { auditLogRepository, userRepository } from '~/server/repositories'
import { UpdateMeSchema } from '~/server/schemas/me.schema'
import { getMe, updateMe } from '~/server/use-cases'

export async function GET(req: Request) {
  const token = getAccessTokenFromCookie(req.headers.get('cookie'))
  if (!token) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
  }

  let payload: { sub: string }
  try {
    payload = verifyAccessToken(token)
  } catch {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
  }

  const result = await getMe(userRepository, payload.sub)

  if (!result.success) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
  }

  return NextResponse.json({ user: result.user }, { status: 200 })
}

export async function PATCH(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = UpdateMeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const result = await updateMe(userRepository, auditLogRepository, {
    userId: principal.userId,
    ...parsed.data,
  })

  return NextResponse.json({ data: result.data }, { status: 200 })
}
