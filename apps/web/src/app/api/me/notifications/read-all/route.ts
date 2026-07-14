import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import { errorResponse } from '~/server/http/error-response'
import { notificationRepository } from '~/server/repositories'
import { markAllMyNotificationsRead } from '~/server/use-cases'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)
  const result = await markAllMyNotificationsRead(
    notificationRepository,
    principal,
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json({ updated: result.updated }, { status: 200 })
}
