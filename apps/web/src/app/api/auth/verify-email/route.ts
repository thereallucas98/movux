import { NextResponse } from 'next/server'
import { userRepository } from '~/server/repositories'
import { VerifyEmailSchema } from '~/server/schemas/auth.schema'
import { verifyEmail } from '~/server/use-cases'

const statusMap = {
  INVALID_OR_EXPIRED_TOKEN: 400,
  ALREADY_VERIFIED: 409,
} as const

const messageMap = {
  INVALID_OR_EXPIRED_TOKEN: 'Token is invalid or has expired.',
  ALREADY_VERIFIED: 'Email is already verified.',
} as const

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = VerifyEmailSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const result = await verifyEmail(userRepository, parsed.data)

  if (!result.success) {
    return NextResponse.json(
      { message: messageMap[result.code], code: result.code },
      { status: statusMap[result.code] },
    )
  }

  return NextResponse.json(
    { message: 'Email verified successfully.' },
    { status: 200 },
  )
}
