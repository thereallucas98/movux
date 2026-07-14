import { NextResponse } from 'next/server'
import { userRepository } from '~/server/repositories'
import { registerUser } from '~/server/use-cases'
import { setAuthCookie } from '~/server/http/cookie'
import { RegisterSchema } from '~/server/schemas/auth.schema'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const result = await registerUser(userRepository, parsed.data)

  if (!result.success) {
    if (result.code === 'EMAIL_IN_USE') {
      return NextResponse.json(
        { message: 'Email already in use' },
        { status: 409 },
      )
    }
    return NextResponse.json({ message: 'Not allowed' }, { status: 403 })
  }

  const res = NextResponse.json({ user: result.user }, { status: 201 })
  setAuthCookie(res, result.token)
  return res
}
