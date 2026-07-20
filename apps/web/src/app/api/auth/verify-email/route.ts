import { NextResponse } from 'next/server'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import { userRepository } from '~/server/repositories'
import { VerifyEmailSchema } from '~/server/schemas/auth.schema'
import { verifyEmail } from '~/server/use-cases'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = VerifyEmailSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const result = await verifyEmail(userRepository, parsed.data.token)
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json({ status: 'VERIFIED' }, { status: 200 })
}
