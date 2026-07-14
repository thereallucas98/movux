import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  scheduleRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { ScheduleIdParamSchema } from '~/server/schemas/schedule.schema'
import { listAssignmentsForSchedule } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; scheduleId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ScheduleIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await listAssignmentsForSchedule(
    workspaceMembershipRepository,
    scheduleRepository,
    assignmentRepository,
    principal,
    { scheduleId: paramParsed.data.scheduleId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
