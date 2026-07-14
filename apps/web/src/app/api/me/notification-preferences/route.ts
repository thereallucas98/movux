import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'
import { notificationPreferenceRepository } from '~/server/repositories'
import { UpdateNotificationPreferencesBodySchema } from '~/server/schemas/notification.schema'
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from '~/server/use-cases'

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  const result = await getMyNotificationPreferences(
    notificationPreferenceRepository,
    principal,
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json({ data: result.data }, { status: 200 })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = UpdateNotificationPreferencesBodySchema.safeParse(body ?? {})
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const principal = await getPrincipal(req)
  const updates = parsed.data.updates.map((u) => ({
    type: u.type as NotificationType,
    channel: u.channel as NotificationChannel,
    enabled: u.enabled,
  }))
  const result = await updateMyNotificationPreferences(
    notificationPreferenceRepository,
    principal,
    { updates },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json({ data: result.data }, { status: 200 })
}
