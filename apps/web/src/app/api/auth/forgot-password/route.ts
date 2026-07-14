import { NextResponse } from 'next/server'
import { userRepository } from '~/server/repositories'
import { ForgotPasswordSchema } from '~/server/schemas/auth.schema'
import { forgotPassword } from '~/server/use-cases'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = ForgotPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  await forgotPassword(userRepository, parsed.data)

  return NextResponse.json(
    { message: 'If the email exists, a reset link has been sent.' },
    { status: 200 },
  )
}
