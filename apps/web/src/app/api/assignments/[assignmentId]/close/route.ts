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
} from '~/server/repositories'
import {
  AssignmentIdParamSchema,
  CloseAssignmentBodySchema,
} from '~/server/schemas/time-entry.schema'
import { closeAssignment } from '~/server/use-cases'

type RouteContext = { params: Promise<{ assignmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = AssignmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => ({}))
  const bodyParsed = CloseAssignmentBodySchema.safeParse(body ?? {})
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await closeAssignment(
    workspaceMembershipRepository,
    assignmentRepository,
    timeEntryRepository,
    auditLogRepository,
    principal,
    {
      assignmentId: paramParsed.data.assignmentId,
      ...(bodyParsed.data.notes !== undefined && {
        notes: bodyParsed.data.notes,
      }),
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
