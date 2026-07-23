import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import { notificationLogRepository } from '~/server/repositories'
import { NotificationIdParamSchema } from '~/server/schemas/notification-log.schema'
import { retryNotification } from '~/server/use-cases'

type RouteContext = { params: Promise<{ notificationId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'ADMIN') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = NotificationIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await retryNotification(
    { notificationLogRepo: notificationLogRepository },
    paramParsed.data.notificationId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json({ status: 'RETRIED' }, { status: 200 })
}
