import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import { errorResponse } from '~/server/http/error-response'
import { notificationRepository } from '~/server/repositories'
import { getMyUnreadNotificationCount } from '~/server/use-cases'

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  const result = await getMyUnreadNotificationCount(
    notificationRepository,
    principal,
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json({ count: result.count }, { status: 200 })
}
