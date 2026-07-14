import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import { notificationRepository } from '~/server/repositories'
import { ListMyNotificationsQuerySchema } from '~/server/schemas/notification.schema'
import { listMyNotifications } from '~/server/use-cases'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const queryRaw = {
    status: url.searchParams.get('status') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  }
  const parsed = ListMyNotificationsQuerySchema.safeParse(queryRaw)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const principal = await getPrincipal(req)
  const result = await listMyNotifications(notificationRepository, principal, {
    ...(parsed.data.status && { status: parsed.data.status }),
    ...(parsed.data.cursor && { cursor: parsed.data.cursor }),
    ...(parsed.data.limit && { limit: parsed.data.limit }),
  })
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(
    { data: result.data, nextCursor: result.nextCursor },
    { status: 200 },
  )
}
