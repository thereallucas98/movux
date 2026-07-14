import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { userRepository } from '~/server/repositories'
import { ChangePasswordSchema } from '~/server/schemas/me.schema'
import { changePassword } from '~/server/use-cases'

export async function PATCH(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = ChangePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const user = await userRepository.findByIdForMe(principal.userId)
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
  }

  const result = await changePassword(userRepository, {
    userId: principal.userId,
    email: user.email,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  })

  if (!result.success) {
    return NextResponse.json(
      { message: 'Current password is incorrect.', code: result.code },
      { status: 400 },
    )
  }

  return NextResponse.json(
    { message: 'Password changed successfully.' },
    { status: 200 },
  )
}
