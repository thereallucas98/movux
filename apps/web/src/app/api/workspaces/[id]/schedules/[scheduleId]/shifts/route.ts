import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponseFromResult,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  categoryRepository,
  scheduleRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { ScheduleIdParamSchema } from '~/server/schemas/schedule.schema'
import {
  CreateShiftSchema,
  ListShiftsQuerySchema,
} from '~/server/schemas/shift.schema'
import { createShift, listShiftsForSchedule } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; scheduleId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = CreateShiftSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await createShift(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    categoryRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      scheduleId: paramParsed.data.scheduleId,
      categoryId: bodyParsed.data.categoryId,
      startAt: bodyParsed.data.startAt,
      endAt: bodyParsed.data.endAt,
      headcount: bodyParsed.data.headcount,
      notes: bodyParsed.data.notes,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 201 })
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const queryParsed = ListShiftsQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    categoryId: url.searchParams.get('categoryId') ?? undefined,
    fromAt: url.searchParams.get('fromAt') ?? undefined,
    toAt: url.searchParams.get('toAt') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)

  const principal = await getPrincipal(req)
  const result = await listShiftsForSchedule(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    principal,
    {
      scheduleId: paramParsed.data.scheduleId,
      filter: {
        status: queryParsed.data.status,
        categoryId: queryParsed.data.categoryId,
        fromAt: queryParsed.data.fromAt,
        toAt: queryParsed.data.toAt,
      },
      cursor: queryParsed.data.cursor,
      limit: queryParsed.data.limit,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 200 })
}
