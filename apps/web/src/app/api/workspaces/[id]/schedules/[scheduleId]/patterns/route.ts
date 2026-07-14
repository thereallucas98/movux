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
  shiftPatternRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { ScheduleIdParamSchema } from '~/server/schemas/schedule.schema'
import { CreatePatternSchema } from '~/server/schemas/shift-pattern.schema'
import { createPattern, listPatternsForSchedule } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; scheduleId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = CreatePatternSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await createPattern(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftPatternRepository,
    categoryRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      scheduleId: paramParsed.data.scheduleId,
      categoryId: bodyParsed.data.categoryId,
      name: bodyParsed.data.name,
      daysOfWeek: bodyParsed.data.daysOfWeek,
      startTimeMinutes: bodyParsed.data.startTimeMinutes,
      endTimeMinutes: bodyParsed.data.endTimeMinutes,
      crossesMidnight: bodyParsed.data.crossesMidnight,
      headcount: bodyParsed.data.headcount,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 201 })
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await listPatternsForSchedule(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftPatternRepository,
    principal,
    { scheduleId: paramParsed.data.scheduleId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
