import { NextResponse } from 'next/server'
import { userRepository } from '~/server/repositories'
import { loginUser } from '~/server/use-cases'
import { setAuthCookie } from '~/server/http/cookie'
import { LoginSchema } from '~/server/schemas/auth.schema'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const result = await loginUser(userRepository, parsed.data)

  if (!result.success) {
    return NextResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 },
    )
  }

  const res = NextResponse.json({ user: result.user }, { status: 200 })
  setAuthCookie(res, result.token)
  return res
}
