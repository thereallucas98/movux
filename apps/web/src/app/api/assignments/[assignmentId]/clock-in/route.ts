import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  timeEntryRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import {
  AssignmentIdParamSchema,
  ClockInBodySchema,
} from '~/server/schemas/time-entry.schema'
import { clockInToShift } from '~/server/use-cases'

type RouteContext = { params: Promise<{ assignmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = AssignmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => ({}))
  const bodyParsed = ClockInBodySchema.safeParse(body ?? {})
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await clockInToShift(
    workspaceMembershipRepository,
    workspaceRepository,
    assignmentRepository,
    timeEntryRepository,
    auditLogRepository,
    principal,
    {
      assignmentId: paramParsed.data.assignmentId,
      ...(bodyParsed.data.lat !== undefined &&
        bodyParsed.data.lng !== undefined && {
          location: { lat: bodyParsed.data.lat, lng: bodyParsed.data.lng },
        }),
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 201 })
}
