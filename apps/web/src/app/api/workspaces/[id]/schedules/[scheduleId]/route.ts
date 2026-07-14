import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  categoryRepository,
  scheduleRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ScheduleIdParamSchema,
  UpdateScheduleSchema,
} from '~/server/schemas/schedule.schema'
import {
  deleteSchedule,
  getScheduleById,
  updateSchedule,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; scheduleId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await getScheduleById(
    scheduleRepository,
    workspaceMembershipRepository,
    principal,
    { scheduleId: paramParsed.data.scheduleId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = UpdateScheduleSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await updateSchedule(
    workspaceMembershipRepository,
    categoryRepository,
    scheduleRepository,
    auditLogRepository,
    principal,
    {
      scheduleId: paramParsed.data.scheduleId,
      data: bodyParsed.data,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await deleteSchedule(
    workspaceMembershipRepository,
    scheduleRepository,
    auditLogRepository,
    principal,
    { scheduleId: paramParsed.data.scheduleId },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
