import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  requestRepository,
  scheduleRepository,
  shiftCandidateRepository,
  shiftRepository,
  shiftTimelineNoteRepository,
  userRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ListShiftTimelineQuerySchema,
  ShiftIdParamSchema,
} from '~/server/schemas/shift-timeline.schema'
import { listShiftTimeline } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shiftId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const queryRaw = {
    order: url.searchParams.get('order') ?? undefined,
    since: url.searchParams.get('since') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  }
  const queryParsed = ListShiftTimelineQuerySchema.safeParse(queryRaw)
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)
  const q = queryParsed.data

  const principal = await getPrincipal(req)
  const result = await listShiftTimeline(
    workspaceMembershipRepository,
    shiftRepository,
    scheduleRepository,
    assignmentRepository,
    shiftCandidateRepository,
    requestRepository,
    auditLogRepository,
    shiftTimelineNoteRepository,
    userRepository,
    principal,
    {
      shiftId: paramParsed.data.shiftId,
      order: q.order,
      cursor: q.cursor ?? null,
      ...(q.limit && { limit: q.limit }),
      ...(q.since && { since: new Date(q.since) }),
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(
    { data: result.data, nextCursor: result.nextCursor },
    { status: 200 },
  )
}
