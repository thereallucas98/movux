import { NextResponse } from 'next/server'
import { userRepository } from '~/server/repositories'
import { ResetPasswordSchema } from '~/server/schemas/auth.schema'
import { resetPassword } from '~/server/use-cases'

const messageMap: Record<string, string> = {
  INVALID_OR_EXPIRED_TOKEN: 'Token is invalid or has expired.',
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = ResetPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const result = await resetPassword(userRepository, parsed.data)

  if (!result.success) {
    return NextResponse.json(
      { message: messageMap[result.code], code: result.code },
      { status: 400 },
    )
  }

  return NextResponse.json(
    { message: 'Password reset successfully.' },
    { status: 200 },
  )
}
