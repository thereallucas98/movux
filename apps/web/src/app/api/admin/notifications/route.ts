import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import { notificationLogRepository } from '~/server/repositories'
import { ListNotificationsQuerySchema } from '~/server/schemas/notification-log.schema'
import { listNotificationsForAdmin } from '~/server/use-cases'

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'ADMIN') return errorResponse('FORBIDDEN')

  const url = new URL(req.url)
  const queryParsed = ListNotificationsQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)

  const result = await listNotificationsForAdmin(
    { notificationLogRepo: notificationLogRepository },
    queryParsed.data,
  )

  return NextResponse.json(result, { status: 200 })
}
