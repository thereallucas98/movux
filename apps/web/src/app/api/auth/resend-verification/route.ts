import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { userRepository } from '~/server/repositories'
import { resendVerification } from '~/server/use-cases'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
  }

  const result = await resendVerification(userRepository, {
    userId: principal.userId,
  })

  if (!result.success) {
    return NextResponse.json(
      { message: 'Email is already verified.', code: result.code },
      { status: 409 },
    )
  }

  return NextResponse.json(
    { message: 'Verification email sent.' },
    { status: 200 },
  )
}
