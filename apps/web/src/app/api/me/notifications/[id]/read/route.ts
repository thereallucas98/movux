import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import { notificationRepository } from '~/server/repositories'
import { NotificationIdParamSchema } from '~/server/schemas/notification.schema'
import { markNotificationRead } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const parsed = NotificationIdParamSchema.safeParse(params)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const principal = await getPrincipal(req)
  const result = await markNotificationRead(notificationRepository, principal, {
    id: parsed.data.id,
  })
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
