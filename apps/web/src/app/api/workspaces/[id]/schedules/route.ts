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
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  CreateScheduleSchema,
  ListSchedulesQuerySchema,
  WorkspaceIdParamSchema,
} from '~/server/schemas/schedule.schema'
import { createSchedule, listSchedulesForWorkspace } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = CreateScheduleSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await createSchedule(
    workspaceMembershipRepository,
    categoryRepository,
    scheduleRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      categoryId: bodyParsed.data.categoryId,
      name: bodyParsed.data.name,
      periodStart: bodyParsed.data.periodStart,
      periodEnd: bodyParsed.data.periodEnd,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 201 })
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const queryParsed = ListSchedulesQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    categoryId: url.searchParams.get('categoryId') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)

  const principal = await getPrincipal(req)
  const result = await listSchedulesForWorkspace(
    workspaceMembershipRepository,
    scheduleRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      filter: {
        status: queryParsed.data.status,
        categoryId: queryParsed.data.categoryId,
        from: queryParsed.data.from,
        to: queryParsed.data.to,
      },
      cursor: queryParsed.data.cursor ?? null,
      limit: queryParsed.data.limit,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 200 })
}
