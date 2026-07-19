import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { userRepository } from '~/server/repositories'
import { getCurrentUser } from '~/server/use-cases'

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const result = await getCurrentUser(userRepository, principal.userId)
  if (!result.success) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(result.user, { status: 200 })
}
