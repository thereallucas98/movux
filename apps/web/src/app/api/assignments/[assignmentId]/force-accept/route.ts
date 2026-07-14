import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { AssignmentIdActionParamSchema } from '~/server/schemas/assignment-decision.schema'
import { forceAcceptAssignment } from '~/server/use-cases'

type RouteContext = { params: Promise<{ assignmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = AssignmentIdActionParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await forceAcceptAssignment(
    workspaceMembershipRepository,
    shiftRepository,
    assignmentRepository,
    auditLogRepository,
    principal,
    { assignmentId: paramParsed.data.assignmentId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(
    { ...result.data, shiftFilled: result.shiftFilled },
    { status: 200 },
  )
}
